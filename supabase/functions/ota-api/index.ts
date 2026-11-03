import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Required Supabase function secrets are missing.");
}

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ message: "Method not allowed." }, 405);
  }

  try {
    const body = await req.json();

    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const dateOfBirth = String(body.dateOfBirth || "").trim();
    const username = String(body.username || "")
      .trim().replace(/^@/, "").toLowerCase();
    const email = String(body.email || "").trim().toLowerCase();
    const phoneNumber = String(body.phoneNumber || "").trim();
    const password = String(body.password || "");
    const displayName =
      String(body.displayName || "").trim() || `${firstName} ${lastName}`;

    if (
      !firstName || !lastName || !dateOfBirth ||
      !username || !email || !phoneNumber || !password
    ) {
      return respond({ message: "Please complete all required fields." }, 400);
    }

    if (firstName.length > 100 || lastName.length > 100) {
      return respond({ message: "Names cannot exceed 100 characters." }, 400);
    }

    if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
      return respond({
        message: "Username must be 3–30 characters using letters, numbers, underscores or periods.",
      }, 400);
    }

    if (!validDate(dateOfBirth)) {
      return respond({ message: "Please provide a valid date of birth." }, 400);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return respond({ message: "Please provide a valid email address." }, 400);
    }

    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      return respond({
        message: "Please use a valid international phone number.",
      }, 400);
    }

    if (password.length < 8) {
      return respond({ message: "Password must be at least 8 characters." }, 400);
    }

    const [emailCheck, usernameCheck, phoneCheck] = await Promise.all([
      admin.from("User").select("id").eq("email", email).maybeSingle(),
      admin.from("User").select("id").eq("username", username).maybeSingle(),
      admin.from("User").select("id").eq("phoneNumber", phoneNumber).maybeSingle(),
    ]);

    if (emailCheck.error || usernameCheck.error || phoneCheck.error) {
      console.error("Profile duplicate check failed.");
      return respond({ message: "Could not validate account details." }, 500);
    }

    if (emailCheck.data || usernameCheck.data || phoneCheck.data) {
      return respond({
        message: "That email, username or phone number is already registered.",
      }, 409);
    }

    const { data, error } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          dateOfBirth,
          username,
          displayName,
          phoneNumber,
        },
      },
    });

    if (error || !data.user) {
      return respond({
        message: error?.message || "Account registration failed.",
      }, 400);
    }

    // The enabled on_auth_user_created_ota_x trigger creates the profile.
    // Do not insert another row into public.User here.
    const { data: profile, error: profileError } = await admin
      .from("User")
      .select(
        "id, firstName, lastName, username, displayName, email, phoneNumber, role, isVerified, isCreatorVerified, isActive",
      )
      .eq("supabaseAuthId", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("The Auth account was created but its profile was not found.");
      return respond({
        message: "Account creation started, but the OTA X profile could not be loaded.",
      }, 500);
    }

    if (!profile.isActive) {
      return respond({ message: "This account is currently disabled." }, 403);
    }

    return respond({
      message: "OTA X account created successfully.",
      token: data.session?.access_token ?? null,
      access_token: data.session?.access_token ?? null,
      refresh_token: data.session?.refresh_token ?? null,
      requiresLogin: !data.session,
      user: profile,
    }, 201);
  } catch (error) {
    console.error("OTA X registration function failed:", error);
    return respond({ message: "Registration failed. Please try again." }, 500);
  }
});
