"use server";

import { createClient } from "@/lib/supabase/server";

export interface CheckinResult {
  error?: string;
  status?: string;
  distanceM?: number | null;
  eventType?: string;
  occurredAt?: string;
}

interface CheckinInput {
  contractId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceHash: string;
}

async function callAttendanceRpc(
  fn: "check_in" | "check_out",
  input: CheckinInput
): Promise<CheckinResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, {
    p_contract_id: input.contractId,
    p_lat: input.latitude,
    p_lng: input.longitude,
    p_accuracy: input.accuracy,
    p_device_hash: input.deviceHash,
  });

  if (error) return { error: error.message };

  // rpc returns the attendance_events row (single-row set function → object)
  const row = Array.isArray(data) ? data[0] : data;
  return {
    status: row?.status,
    distanceM: row?.distance_m ?? null,
    eventType: row?.event_type,
    occurredAt: row?.occurred_at,
  };
}

export async function checkInAction(input: CheckinInput): Promise<CheckinResult> {
  return callAttendanceRpc("check_in", input);
}

export async function checkOutAction(input: CheckinInput): Promise<CheckinResult> {
  return callAttendanceRpc("check_out", input);
}
