import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Loading placeholders shaped like the content they stand in for, so nothing jumps when the data
// streams in. Each page's Suspense fallback is one of the skeletons at the bottom, built from the
// pieces at the top.
//
// The pulse only runs when motion is allowed: the reduced-motion rule in globals.css shortens every
// animation to 1ms, which would turn an endless pulse into a flicker.

/** One grey placeholder shape. */
export function Bone({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block rounded-md bg-fill-secondary motion-safe:animate-pulse", className)} />;
}

/** The outer wrapper: screen readers hear "Loading…" once; the shapes are hidden from them. */
function Skeleton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <span role="status" className="sr-only">
        Loading…
      </span>
      {children}
    </div>
  );
}

/** A card surface, as `Card` draws it, holding placeholder content. */
function CardBone({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn("flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-card", className)}>{children}</div>;
}

/** A card with a title bar and a few lines of text. */
function TextCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <CardBone className={className}>
      <Bone className="h-5 w-28" />
      {Array.from({ length: lines }, (_, index) => (
        <Bone key={index} className={cn("h-3.5", index % 3 === 2 ? "w-2/3" : "w-full")} />
      ))}
    </CardBone>
  );
}

/** The eyebrow and large title of `PageHeader`, for pages whose header waits for data. */
function HeaderBones({ actions = 0 }: { actions?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-3 w-28" />
      <Bone className="h-9 w-72 max-w-full" />
      {actions > 0 && (
        <div className="mt-2 flex gap-2">
          {Array.from({ length: actions }, (_, index) => (
            <Bone key={index} className="h-9 w-28 rounded-full" />
          ))}
        </div>
      )}
    </div>
  );
}

/** A row of term columns, as on the pathway board. */
function TermColumns({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-start gap-3 overflow-hidden">
      {Array.from({ length: columns }, (_, column) => (
        <div key={column} className="flex w-64 shrink-0 flex-col gap-2.5 rounded-2xl bg-fill-tertiary p-2.5">
          <div className="flex justify-between px-1.5 pt-1">
            <Bone className="h-5 w-32" />
            <Bone className="h-4 w-10" />
          </div>
          {Array.from({ length: 4 - (column % 2) }, (_, card) => (
            <div key={card} className="flex flex-col gap-2 rounded-xl bg-card p-3 shadow-card">
              <Bone className="h-4 w-20" />
              <Bone className="h-3 w-40" />
              <Bone className="h-3 w-10" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Page skeletons, one per Suspense boundary.

export function DashboardSkeleton() {
  return (
    <Skeleton className="gap-6">
      <HeaderBones />
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <CardBone key={index} className="gap-2 p-4">
            <Bone className="h-3.5 w-20" />
            <Bone className="h-5 w-40" />
            <Bone className="h-3.5 w-32" />
          </CardBone>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-3">
          <Bone className="h-6 w-28" />
          <TextCard lines={8} />
        </div>
        <div className="flex flex-col gap-4 lg:pt-10">
          <TextCard lines={2} />
          <TextCard lines={5} />
        </div>
      </div>
    </Skeleton>
  );
}

export function BoardSkeleton() {
  return (
    <Skeleton className="gap-5">
      <div className="flex flex-col gap-2">
        <Bone className="h-4 w-96 max-w-full" />
        <Bone className="h-1.5 w-full rounded-full" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Bone key={index} className="h-6 w-24 rounded-full" />
        ))}
      </div>
      <TermColumns />
    </Skeleton>
  );
}

export function RequirementsSkeleton() {
  return (
    <Skeleton>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <CardBone key={index} className="items-center p-4">
              <Bone className="size-24 rounded-full border-[9.6px] border-fill-secondary bg-transparent" />
              <Bone className="h-4 w-24" />
              <Bone className="h-3 w-20" />
            </CardBone>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <CardBone key={index} className="flex-row items-center px-3 py-2.5">
              <Bone className="size-11 shrink-0 rounded-full border-[4.4px] border-fill-secondary bg-transparent" />
              <span className="flex flex-1 flex-col gap-1.5">
                <Bone className="h-4 w-28" />
                <Bone className="h-3 w-16" />
              </span>
            </CardBone>
          ))}
        </div>
      </div>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Bone className="h-6 w-40" />
          <TextCard lines={4} />
        </div>
      ))}
    </Skeleton>
  );
}

/** A stack of cards: swap options, saved plans. */
export function CardListSkeleton({ count = 3, lines = 4 }: { count?: number; lines?: number }) {
  return (
    <Skeleton className="gap-3">
      {Array.from({ length: count }, (_, index) => (
        <TextCard key={index} lines={lines} />
      ))}
    </Skeleton>
  );
}

export function GraphSkeleton() {
  return (
    <Skeleton className="gap-4">
      <div className="flex justify-between">
        <Bone className="h-4 w-80 max-w-full" />
        <Bone className="h-8 w-32 rounded-full" />
      </div>
      <div className="flex gap-18 overflow-hidden">
        {Array.from({ length: 5 }, (_, column) => (
          <div key={column} className="flex w-42 shrink-0 flex-col gap-3.5">
            <Bone className="h-4 w-28" />
            {Array.from({ length: 5 - (column % 3) }, (_, node) => (
              <div key={node} className="flex h-[3.625rem] flex-col justify-center gap-1.5 rounded-xl bg-card p-2 shadow-card">
                <Bone className="h-3.5 w-16" />
                <Bone className="h-3 w-28" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

export function CalendarSkeleton() {
  return (
    <Skeleton>
      <HeaderBones actions={3} />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl bg-card p-2 shadow-card">
            <Bone className="size-6 rounded-full" />
          </div>
        ))}
      </div>
    </Skeleton>
  );
}

export function CoursesSkeleton() {
  return (
    <Skeleton>
      <HeaderBones />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <TextCard key={index} lines={3} />
        ))}
      </div>
    </Skeleton>
  );
}

export function CourseSkeleton() {
  return (
    <Skeleton>
      <HeaderBones actions={1} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-4">
          <Bone className="h-6 w-36" />
          <TextCard lines={7} />
          <Bone className="mt-4 h-6 w-40" />
          <TextCard lines={2} />
        </div>
        <div className="flex flex-col gap-6">
          <CardBone>
            <Bone className="h-6 w-20" />
            <Bone className="h-10 w-40" />
            <Bone className="h-10 w-full rounded-xl" />
          </CardBone>
          <TextCard lines={5} />
        </div>
      </div>
    </Skeleton>
  );
}

export function SettingsSkeleton() {
  return (
    <Skeleton>
      <div className="flex flex-col gap-3">
        <div className="flex justify-between">
          <Bone className="h-6 w-20" />
          <Bone className="h-9 w-28 rounded-full" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <TextCard lines={1} />
          <TextCard lines={1} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Bone className="h-6 w-48" />
        <RowsCard />
      </div>
    </Skeleton>
  );
}

/** A card of rows with a control on the right, as in the course links list. */
function RowsCard({ rows = 4 }: { rows?: number }) {
  return (
    <CardBone className="gap-0 divide-y divide-separator py-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-6 py-3">
          <div className="flex flex-col gap-1.5">
            <Bone className="h-4 w-20" />
            <Bone className="h-3 w-40" />
          </div>
          <Bone className="h-10 w-72 max-w-[50%] rounded-xl" />
        </div>
      ))}
    </CardBone>
  );
}

export function CourseLinksSkeleton() {
  return (
    <Skeleton>
      <RowsCard />
    </Skeleton>
  );
}

export function PlanSkeleton() {
  return (
    <Skeleton>
      <HeaderBones actions={4} />
      <TextCard lines={2} />
      <TermColumns />
    </Skeleton>
  );
}

export function CompareSkeleton() {
  return (
    <Skeleton>
      <HeaderBones actions={1} />
      <div className="grid gap-3 md:grid-cols-2">
        <TextCard lines={6} />
        <TextCard lines={6} />
      </div>
    </Skeleton>
  );
}
