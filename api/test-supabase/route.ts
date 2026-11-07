
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("Sensor_Data")
    .select("*")
    .limit(5);

  if (error) {
    return NextResponse.json({
      status: "GAGAL",
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  return NextResponse.json({
    status: "BERHASIL",
    jumlah_data: data.length,
    data,
  });
}

