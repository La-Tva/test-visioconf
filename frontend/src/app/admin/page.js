"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from './AdminDashboard';

export default function AdminPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== 'admin') {
                router.push('/home'); // Redirect to normal home if not admin
            } else {
                setIsAuthorized(true);
            }
        } catch (e) {
            router.push('/');
        }
    }, [router]);

    if (!isAuthorized) {
        return null; // Or a loading spinner
    }

    return <AdminDashboard />;
}
