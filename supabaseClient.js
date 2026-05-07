const SUPABASE_URL = "https://khslqpvwlbdouvlcvkkw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8ky0Ovd-OQmcu09axXg2Cw_njnFFpGe";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);