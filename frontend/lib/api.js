export async function getOrg() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const response = await fetch(
      `${baseUrl}/organisationAdmin/my-organisation`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch organisation');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
