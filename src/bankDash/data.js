// Assume Supabase is already initialized
async function fetchFromSupabase() {
  const { data, error } = await supabase
    .from('onlinbanking')
    .select('*');

  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  // Save the result globally
  window.dataBase = data;
  console.log('Data saved to window.dataBase:', data);
}

// Call it immediately
fetchFromSupabase();

  
let 
     