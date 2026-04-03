import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ArrowLeft, Layers, Pencil } from "lucide-react";
import { getSegments, evaluateSegment } from "./actions";
import { DeleteSegmentButton } from "./_components/delete-segment-button";

export const metadata: Metadata = {
  title: "Segments CRM",
};

const SegmentsPage = async () => {
  const segments = await getSegments();

  // Evaluate client count for each segment
  const segmentCounts = await Promise.all(
    segments.map((s) => evaluateSegment(s.id).then((clients) => clients.length)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/espace-consultante/crm"
          className="rounded-md p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex flex-1 items-center justify-between">
          <h1 className="font-serif text-2xl font-bold text-primary-green">
            Segments
          </h1>
          <Button asChild>
            <Link href="/espace-consultante/crm/segments/nouveau">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau segment
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary-green">
            <Layers className="h-5 w-5" />
            Segments automatiques ({segments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {segments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead className="text-center">Clients</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((segment, i) => (
                  <TableRow key={segment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: segment.color }}
                        />
                        <div>
                          <p className="font-medium">{segment.name}</p>
                          {segment.description && (
                            <p className="text-xs text-muted-foreground">
                              {segment.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {segment.conditions.map((cond, ci) => (
                          <Badge key={ci} variant="outline" className="text-xs font-mono">
                            {cond.field} {cond.op} {cond.value}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {segmentCounts[i]}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/espace-consultante/crm/segments/${segment.id}/edit`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteSegmentButton segmentId={segment.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              Aucun segment. Créez votre premier segment pour regrouper vos
              clients automatiquement selon des critères.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SegmentsPage;
