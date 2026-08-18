"use client"

import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];


const EventCalendar = () => {
    const [value, onChange] = useState<Value>(new Date());

    const router = useRouter();

    useEffect(() => {
        if (value instanceof Date) {
            router.push(`?date=${value.toISOString().split("T")[0]}`);
        }
    }, [value, router]);

    // react-calendar builds each day tile's aria-label with Intl.DateTimeFormat
    // using the runtime's default locale when no `locale` prop is given. The
    // Node.js SSR runtime and the browser resolve different default locales
    // (e.g. "July 27, 2026" vs "27 July 2026"), so the server-rendered HTML
    // and the client's first render disagreed and React flagged a hydration
    // mismatch on every tile. Pinning an explicit locale makes the label
    // identical on both sides.
    return <Calendar onChange={onChange} value={value} locale="en-ZA" />
};

export default EventCalendar;