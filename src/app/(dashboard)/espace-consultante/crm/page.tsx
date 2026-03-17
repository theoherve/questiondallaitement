import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users } from "lucide-react";
import Link from "next/link";
import { getContacts, getTags } from "./actions";
import { TagsManager } from "./_components/tags-manager";

export const metadata: Metadata = {
  title: "CRM",
};

const CrmPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag_id?: string }>;
}) => {
  const params = await searchParams;
  const [contacts, tags] = await Promise.all([
    getContacts({ q: params.q, tag_id: params.tag_id }),
    getTags(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-primary-green">
          CRM
        </h1>
        <TagsManager tags={tags} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="crm-search"
                className="mb-1 block text-sm font-medium"
              >
                Rechercher
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="crm-search"
                  name="q"
                  placeholder="Nom, email…"
                  defaultValue={params.q ?? ""}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <label
                htmlFor="crm-tag"
                className="mb-1 block text-sm font-medium"
              >
                Tag
              </label>
              <select
                id="crm-tag"
                name="tag_id"
                defaultValue={params.tag_id ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Tous les tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <Users className="h-5 w-5" />
            Contacts ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Consultations</TableHead>
                  <TableHead className="text-center">Formations</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Link
                        href={`/espace-consultante/crm/${contact.id}`}
                        className="font-medium text-primary-green hover:underline"
                      >
                        {contact.first_name || contact.last_name
                          ? `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim()
                          : contact.email}
                      </Link>
                      {(contact.first_name || contact.last_name) && (
                        <p className="text-xs text-muted-foreground">
                          {contact.email}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {contact.bookings_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {contact.enrollments_count}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs"
                            style={
                              tag.color
                                ? {
                                    borderColor: tag.color,
                                    color: tag.color,
                                  }
                                : undefined
                            }
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              {params.q || params.tag_id
                ? "Aucun contact trouvé avec ces filtres."
                : "Aucun contact pour le moment. Les clients apparaîtront ici après leur première réservation ou inscription à une formation."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CrmPage;
