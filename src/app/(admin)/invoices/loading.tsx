import { Skeleton } from "@/components/ui/skeleton"

export default function InvoicesLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-32" />)}
      </div>
      
      <div className="rounded-md border p-4 space-y-4 bg-white">
        <Skeleton className="h-8 w-full" />
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  )
}
