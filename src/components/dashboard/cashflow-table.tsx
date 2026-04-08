"use client";

import { useState } from "react";
import { useCashFlow } from "@/hooks/use-cashflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, History, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 15;

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "180D", days: 180 },
];

export function CashFlowTable() {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);

  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const endDate = now.toISOString();

  const { data: flows, isLoading, error } = useCashFlow(startDate, endDate);

  const totalPages = flows ? Math.ceil(flows.length / PAGE_SIZE) : 0;
  const pagedFlows = flows?.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Cash Flow
          </CardTitle>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.days}
                variant={days === opt.days ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setDays(opt.days);
                  setPage(0);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-muted-foreground">
            Failed to load cash flow.
          </p>
        )}

        {flows && flows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No cash flow records found.
          </p>
        )}

        {pagedFlows && pagedFlows.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedFlows.map((flow, idx) => (
                    <TableRow key={`${flow.businessTime}-${idx}`}>
                      <TableCell className="text-sm">
                        {formatDate(flow.businessTime)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {flow.transactionFlowName}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {flow.description}
                      </TableCell>
                      <TableCell className="text-sm">
                        {flow.symbol || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            flow.direction === 1
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {flow.direction === 1 ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {formatCurrency(Math.abs(flow.balance), flow.currency)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {pagedFlows.map((flow, idx) => (
                <div
                  key={`${flow.businessTime}-${idx}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {flow.transactionFlowName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {flow.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(flow.businessTime)}
                      {flow.symbol ? ` | ${flow.symbol}` : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "ml-3 flex shrink-0 items-center gap-1 font-medium",
                      flow.direction === 1
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {flow.direction === 1 ? (
                      <ArrowDownLeft className="h-3 w-3" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3" />
                    )}
                    {formatCurrency(Math.abs(flow.balance), flow.currency)}
                  </span>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages} ({flows!.length} records)
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
