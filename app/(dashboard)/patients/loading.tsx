import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoadingPatients() {
  return (
    <div className="space-y-6 relative min-h-full">
      <div className="sticky top-16 z-30 bg-gray-50 pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
