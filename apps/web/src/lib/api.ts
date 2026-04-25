const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(
  /\/+$/,
  ""
);

function apiUrl(path: string) {
  return `${API_URL}/${path.replace(/^\/+/, "")}`;
}

async function getErrorMessage(res: Response) {
  const errorBody = await res.json().catch(() => null);
  return (
    (typeof errorBody?.error === "string"
      ? errorBody.error
      : errorBody?.error?.formErrors?.[0] ??
        Object.values(errorBody?.error?.fieldErrors ?? {})
          .flat()
          .find((value) => typeof value === "string")) ??
    `API error: ${res.status} ${res.statusText}`
  );
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = apiUrl(path);
  let res: Response;

  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof TypeError
        ? `Cannot reach the API at ${API_URL}. Make sure the API dev server is running.`
        : "Network request failed"
    );
  }

  if (!res.ok) {
    throw new Error(String(await getErrorMessage(res)));
  }

  return res.json() as Promise<T>;
}

export async function apiBlob(path: string, init?: RequestInit) {
  const url = apiUrl(path);
  let res: Response;

  try {
    res = await fetch(url, {
      ...init,
      headers: init?.headers,
    });
  } catch (error) {
    throw new Error(
      error instanceof TypeError
        ? `Cannot reach the API at ${API_URL}. Make sure the API dev server is running.`
        : "Network request failed"
    );
  }

  if (!res.ok) {
    throw new Error(String(await getErrorMessage(res)));
  }

  return {
    blob: await res.blob(),
    contentDisposition: res.headers.get("content-disposition"),
  };
}
