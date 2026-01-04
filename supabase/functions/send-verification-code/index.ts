import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  email: string;
  fullName: string;
  password: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, password }: SendVerificationRequest = await req.json();

    if (!email || !fullName || !password) {
      return new Response(
        JSON.stringify({ error: "Email, nom complet et mot de passe requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists in auth.users
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(user => user.email === email);
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "Un compte existe déjà avec cet email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate verification code
    const code = generateCode();

    // Delete any existing verification codes for this email
    await supabase
      .from("email_verification_codes")
      .delete()
      .eq("email", email);

    // Store the verification code (password stored as plain text temporarily, will be used to create account)
    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        email,
        code,
        full_name: fullName,
        password_hash: password, // We'll use this to create the account later
      });

    if (insertError) {
      console.error("Error inserting verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la création du code de vérification" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send verification email
    const rawFrom = (Deno.env.get("RESEND_FROM") ?? "").trim();
    // If RESEND_FROM is empty or whitespace, fall back to a known-valid default.
    const from = rawFrom.length > 0 ? rawFrom : "LampaTrack <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from,
      to: [email],
      subject: "Code de vérification LampaTrack",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">Bienvenue sur LampaTrack</h1>
          <p style="color: #666; font-size: 16px;">Bonjour ${fullName},</p>
          <p style="color: #666; font-size: 16px;">Voici votre code de vérification pour créer votre compte :</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Ce code expire dans 15 minutes.</p>
          <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé ce code, veuillez ignorer cet email.</p>
        </div>
      `,
    });

    console.log("Verification email send result:", emailResponse);

    if (emailResponse.error) {
      return new Response(
        JSON.stringify({
          error: "Erreur lors de l'envoi de l'email de vérification",
          details: emailResponse.error.message,
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Code de vérification envoyé" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
