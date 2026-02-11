
const formDAT = document.getElementById('signupForm');

formDAT.addEventListener('submit', async (event) => {
    event.preventDefault(); // This stops the page from refreshing

    const formData = new FormData(formDAT);
    let email = formData.get('email')?.toLowerCase().trim();
    let password = formData.get('password')?.trim();

    // Testing the trigger
    if (email) {
        alert('Form submitted for: ' + email);
        // This is where you would normally add your fetch() call to a server
    }
});
