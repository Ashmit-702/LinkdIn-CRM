import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const provider = process.env.LINKEDIN_PROVIDER ?? "mock";
  return (
    <div>
      <Topbar title="Settings" />
      <div className="flex flex-col gap-4 p-6">
        <Card>
          <CardHeader><CardTitle>LinkedIn data provider</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p>
              Current provider: <span className="font-medium">{provider}</span>
            </p>
            <p className="mt-2 text-muted-foreground">
              Set <code>LINKEDIN_PROVIDER=apify</code> and the <code>APIFY_*</code> environment
              variables to switch from mock data to live Apify data. See the README for details.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
