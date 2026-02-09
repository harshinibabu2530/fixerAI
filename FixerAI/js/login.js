const {
    data: { user }
} = await supabase.auth.getUser();

const role = user.user_metadata.role;

await supabase.from("profiles").insert({
    id: user.id,
    email: user.email,
    role: role
});
