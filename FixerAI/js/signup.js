const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            role: selectedRole // "user" or "worker"
        },
        emailRedirectTo: "http://localhost:5500/project/login.html"
    }
});

if (error) {
    message.innerText = error.message;
} else {
    message.innerText = "Check your email to confirm signup";
}
