import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewsletterBlogDigest } from "@/lib/emails/send";
import { unsubscribeUrlFor } from "@/lib/newsletter/unsubscribe";
import { baseUrl } from "@/lib/url";
import { isoWeek } from "@/lib/date/iso-week";

const LAST_SENT_KEY = "newsletter_weekly_digest_last_sent";
const ENABLED_KEY = "newsletter_weekly_digest_enabled";

/**
 * Annonce hebdomadaire du blog, envoyee aux abonnees de la newsletter.
 *
 * Ne s'execute que le lundi, et une seule fois par semaine ISO : le cron est
 * horaire, donc plusieurs passages tombent un lundi. Contrairement a
 * `runWeeklyDigest`, l'audience n'est pas le systeme de notifications interne
 * (comptes clients) mais `newsletter_subscribers`, une liste publique sans
 * compte — la dedupe ne peut donc pas s'appuyer sur la table `notifications`
 * et est plutot lue dans `platform_settings`.
 *
 * S'il n'y a aucun article publie dans les 7 jours precedents, aucun email
 * n'est envoye : un lundi sans nouveaute n'a rien a annoncer.
 */
export const runNewsletterBlogDigest = async (
  now: Date = new Date(),
): Promise<number> => {
  if (now.getDay() !== 1) return 0;

  const supabase = createAdminClient();

  const { data: enabledRows } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", ENABLED_KEY);
  // Absent = pas encore configure, donc actif par defaut plutot que muet.
  const enabled = (enabledRows?.[0]?.value as { enabled?: boolean } | undefined)?.enabled ?? true;
  if (!enabled) return 0;

  const week = isoWeek(now);

  const { data: lastSentRows } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", LAST_SENT_KEY);
  const lastSentWeek = (lastSentRows?.[0]?.value as { week?: string } | undefined)?.week;
  if (lastSentWeek === week) return 0;

  const since = subDays(now, 7).toISOString();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("title, slug, excerpt, thumbnail_url")
    .eq("status", "published")
    .is("deleted_at", null)
    .gte("published_at", since)
    .order("published_at", { ascending: true });

  if (!posts || posts.length === 0) return 0;

  const { data: subscribers } = await supabase
    .from("newsletter_subscribers")
    .select("email, first_name, unsubscribe_token")
    .is("unsubscribed_at", null);

  if (!subscribers || subscribers.length === 0) return 0;

  const digestPosts = posts.map((post) => ({
    title: post.title as string,
    excerpt: post.excerpt as string | null,
    thumbnail_url: post.thumbnail_url as string | null,
    url: `${baseUrl()}/blog/${post.slug}`,
  }));

  let sent = 0;
  for (const subscriber of subscribers) {
    try {
      await sendNewsletterBlogDigest(subscriber.email as string, {
        first_name: (subscriber.first_name as string) || "",
        posts: digestPosts,
        unsubscribe_url: unsubscribeUrlFor(subscriber.unsubscribe_token as string),
      });
      sent++;
    } catch (err) {
      console.error(
        `Failed to send newsletter blog digest to ${subscriber.email}:`,
        err,
      );
    }
  }

  await supabase.from("platform_settings").upsert(
    {
      key: LAST_SENT_KEY,
      value: {
        week,
        sent_at: now.toISOString(),
        subscriber_count: sent,
        post_count: digestPosts.length,
        post_titles: digestPosts.map((p) => p.title),
      },
      updated_at: now.toISOString(),
    },
    { onConflict: "key" },
  );

  return sent;
};
