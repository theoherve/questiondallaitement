import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSurveyBySlug } from "@/lib/surveys/queries";
import { QuizRunner } from "@/components/surveys/quiz-runner";

/**
 * Page d'un quiz.
 *
 * Les sondages s'affichent dans un article de blog, via un bloc de l'éditeur.
 * Un quiz, lui, se partage : il est cité depuis les fiches de formation et
 * depuis les réseaux, il lui faut donc une adresse à lui.
 */

type Props = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);
  if (!survey || survey.kind !== "quiz") return { title: "Quiz introuvable" };

  return {
    title: survey.title,
    description: survey.intro ?? undefined,
    openGraph: {
      title: survey.title,
      description: survey.intro ?? undefined,
      type: "article",
    },
  };
};

const QuizPage = async ({ params }: Props) => {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);

  // Un sondage d'opinion servi ici n'aurait ni score ni correction à montrer :
  // c'est une adresse réservée aux quiz.
  if (!survey || survey.kind !== "quiz") notFound();

  return (
    <div>
      <section className="bg-primary-green px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-serif text-2xl font-bold text-white sm:text-3xl">
            {survey.title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <QuizRunner survey={survey} />
      </div>
    </div>
  );
};

export default QuizPage;
