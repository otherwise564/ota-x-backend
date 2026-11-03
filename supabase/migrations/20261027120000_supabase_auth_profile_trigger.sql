-- OTA X: create a profile for each new Supabase Auth account.
-- Review before applying to the live Supabase database.
-- Keep OTA X integer IDs and existing social relationships intact.

CREATE OR REPLACE FUNCTION public.handle_new_ota_x_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  profile_username text;
  profile_first_name text;
  profile_last_name text;
  profile_display_name text;
  profile_phone text;
  profile_dob text;
BEGIN
  profile_username := lower(trim(coalesce(
    NEW.raw_user_meta_data ->> 'username', ''
  )));
  profile_first_name := trim(coalesce(
    NEW.raw_user_meta_data ->> 'firstName', ''
  ));
  profile_last_name := trim(coalesce(
    NEW.raw_user_meta_data ->> 'lastName', ''
  ));
  profile_display_name := trim(coalesce(
    NEW.raw_user_meta_data ->> 'displayName', ''
  ));
  profile_phone := trim(coalesce(
    NEW.raw_user_meta_data ->> 'phoneNumber', ''
  ));
  profile_dob := trim(coalesce(
    NEW.raw_user_meta_data ->> 'dateOfBirth', ''
  ));

  IF NEW.email IS NULL OR trim(NEW.email) = '' THEN
    RAISE EXCEPTION 'An email address is required for an OTA X profile.';
  END IF;

  IF profile_username !~ '^[a-z0-9_.]{3,30}$' THEN
    RAISE EXCEPTION 'The OTA X username is invalid.';
  END IF;

  IF profile_first_name = '' OR profile_last_name = '' THEN
    RAISE EXCEPTION 'First and last names are required.';
  END IF;

  IF profile_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'A valid international phone number is required.';
  END IF;

  IF profile_dob = '' OR profile_dob::date > CURRENT_DATE THEN
    RAISE EXCEPTION 'A valid date of birth is required.';
  END IF;

  INSERT INTO public."User" (
    "username",
    "firstName",
    "lastName",
    "dateOfBirth",
    "displayName",
    "email",
    "phoneNumber",
    "supabaseAuthId",
    "password",
    "role",
    "isVerified",
    "isActive",
    "lastSeenAt"
  )
  VALUES (
    profile_username,
    profile_first_name,
    profile_last_name,
    profile_dob::date,
    NULLIF(profile_display_name, ''),
    lower(trim(NEW.email)),
    profile_phone,
    NEW.id,
    NULL,
    'USER'::public."Role",
    NEW.email_confirmed_at IS NOT NULL,
    TRUE,
    now()
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created_ota_x ON auth.users;

CREATE TRIGGER on_auth_user_created_ota_x
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_ota_x_user();

-- The function should be invoked by its trigger, not directly by API roles.
REVOKE ALL ON FUNCTION public.handle_new_ota_x_user()
FROM PUBLIC, anon, authenticated;
