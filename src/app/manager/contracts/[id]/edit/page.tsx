import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContractForm, type ContractFormDefaults } from "../../contract-form";
import { updateContractAction } from "../../actions";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "client_name, site_name, start_date, end_date, monthly_value, status, address, latitude, longitude, geofence_radius_m"
    )
    .eq("id", id)
    .single();

  if (!contract) {
    notFound();
  }

  const defaultValues: ContractFormDefaults = {
    clientName: contract.client_name,
    siteName: contract.site_name,
    startDate: contract.start_date,
    endDate: contract.end_date ?? "",
    monthlyValue: String(contract.monthly_value),
    status: contract.status,
    address: contract.address ?? "",
    latitude: contract.latitude != null ? String(contract.latitude) : "",
    longitude: contract.longitude != null ? String(contract.longitude) : "",
    geofenceRadiusM: contract.geofence_radius_m != null ? String(contract.geofence_radius_m) : "75",
  };

  return (
    <ContractForm
      titleKey="contracts.editContract"
      action={updateContractAction.bind(null, id)}
      defaultValues={defaultValues}
      isEdit
    />
  );
}
