import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnrollToAccompagnementModal } from "@/app/(dashboard)/admin/utilisateurs/_components/enroll-to-accompagnement-modal";

type Enrollment = {
  id: string;
  enrolled_at: string;
  formations: { title: string; status: string } | null;
  progress_pct: number;
};

export const TabAccompagnements = ({
  enrollments,
  userId,
}: {
  enrollments: Enrollment[];
  userId: string;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-primary-green">
          Accompagnements ({enrollments.length})
        </CardTitle>
        <EnrollToAccompagnementModal clientId={userId} />
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun accompagnement acheté.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Accompagnement</TableHead>
                <TableHead>Date d&apos;inscription</TableHead>
                <TableHead>Progression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    {e.formations?.title ?? "—"}
                  </TableCell>
                  <TableCell>
                    {new Date(e.enrolled_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            e.progress_pct === 100
                              ? "bg-green-500"
                              : "bg-primary-green"
                          }`}
                          style={{ width: `${e.progress_pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {e.progress_pct}%
                      </span>
                      {e.progress_pct === 100 && (
                        <Badge
                          variant="outline"
                          className="border-green-200 text-green-700"
                        >
                          Terminé
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
