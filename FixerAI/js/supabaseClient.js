export const supabaseUrl = "https://qoiefpivdhmrsatfpwwm.supabase.co";
export const supabaseKey = "sb_publishable_J8w9lkhDrxFBv-3jQx95BA_BHmEgA5A";

// Assuming Supabase is loaded via script tag in HTML, but we want an exportable client
// If Supabase is not globally available yet, we might need a better way, 
// but since it's a module, it's better to have a dedicated client file.

export const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
