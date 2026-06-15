"use client";

import { ContractForm } from "../contract-form";
import { createContractAction } from "../actions";

export default function NewContractPage() {
  return <ContractForm titleKey="contracts.addContract" action={createContractAction} />;
}
