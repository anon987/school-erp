import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import type { SchoolProfile } from "./types";

interface SchoolProfileRow {
  id: string;
  legal_name: string;
  board: string | null;
  address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  gstin: string | null;
}

export async function getSchoolProfile(schoolId: string): Promise<SchoolProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("school")
    .select("id, legal_name, board, address, contact_phone, contact_email, gstin")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as SchoolProfileRow;
  return {
    id: row.id,
    legalName: row.legal_name,
    board: row.board,
    address: row.address,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    gstin: row.gstin,
  };
}
