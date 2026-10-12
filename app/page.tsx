import DashboardClient from "../components/dashboard-client";
import { getFinanceData } from "../lib/finance-data";

export const revalidate = 300;

export default async function Home() {
  const data = await getFinanceData();
  return <DashboardClient initialData={data.rows} source={data.source} updatedAt={data.updatedAt} connectionMessage={data.connectionMessage} />;
}
