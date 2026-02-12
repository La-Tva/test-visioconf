"use client";
import { SWRConfig } from 'swr';

const fetcher = (url) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
});

export default function SWRProvider({ children }) {
  return (
    <SWRConfig value={{ fetcher }}>
      {children}
    </SWRConfig>
  );
}
