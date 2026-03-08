import { getBootstrapData } from "@/application/ecp/platform-service";
import { ConfiguratorClient } from "@/components/ecp/configurator-client";
import { getSessionSummary } from "@/lib/auth";

export default async function Home() {
  const [bootstrapData, session] = await Promise.all([Promise.resolve(getBootstrapData()), getSessionSummary()]);

  return <ConfiguratorClient bootstrapData={bootstrapData} session={session} />;
}