import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { db } from "@/drizzle/db";
import { scheduleAvailabilityTable } from "@/drizzle/schema";
import { getCalendarEventTimes } from "@/server/googleCalendar";
import {
    addMinutes,
    areIntervalsOverlapping,
    setHours,
    setMinutes,
    isWithinInterval
} from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export async function getValidTimesFromSchedule(
    timesInOrder: Date[],
    event: { clerkUserId: string; durationInMinutes: number }
) {
    const start = timesInOrder[0];
    const end = timesInOrder.at(-1);
    if (start == null || end == null) return [];
    const schedule = await db.query.ScheduleTable.findFirst({
        where: ({ clerkUserId: userIdCol }, { eq }) => eq(userIdCol, event.clerkUserId),
        with: { availabilities: true },
    });
    if (schedule == null) return [];

    const groupedAvailabilities = schedule.availabilities.reduce((acc, availability) => {
        const day = availability.dayOfWeek;
        if (!acc[day]) acc[day] = [];
        acc[day].push(availability);
        return acc;
    }, {} as Partial<Record<(typeof DAYS_OF_WEEK_IN_ORDER)[number], (typeof scheduleAvailabilityTable.$inferSelect)[]>>);

    const eventTimes = await getCalendarEventTimes(event.clerkUserId, {
        start,
        end,
    });

    return timesInOrder.filter(intervalDate => {
        const availabilities = getAvailabilities(
            groupedAvailabilities,
            intervalDate,
            schedule.timezone
        );
        const eventInterval = {
            start: intervalDate,
            end: addMinutes(intervalDate, event.durationInMinutes),
        };
        return (
            eventTimes.every(eventTime => {
                return !areIntervalsOverlapping(eventTime, eventInterval);
            }) &&
            availabilities.some(availability => {
                return (
                    isWithinInterval(eventInterval.start, availability) &&
                    isWithinInterval(eventInterval.end, availability)
                );
            })
        );
    });
}

type ScheduleAvailability = {
    startTime: string;
    endTime: string;
    dayOfWeek: (typeof DAYS_OF_WEEK_IN_ORDER)[number];
};

type GroupedAvailabilities = Partial<
    Record<(typeof DAYS_OF_WEEK_IN_ORDER)[number], ScheduleAvailability[]>
>;

function getAvailabilities(
    groupedAvailabilities: GroupedAvailabilities,
    date: Date,
    timezone: string
) {
    const dayOfWeek = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase() as (typeof DAYS_OF_WEEK_IN_ORDER)[number];
    const availabilities = groupedAvailabilities[dayOfWeek];

    if (availabilities == null) return [];

    return availabilities.map(({ startTime, endTime }) => {
        const start = fromZonedTime(
            setMinutes(
                setHours(date, parseInt(startTime.split(":")[0])),
                parseInt(startTime.split(":")[1])
            ),
            timezone
        );
        const end = fromZonedTime(
            setMinutes(
                setHours(date, parseInt(endTime.split(":")[0])),
                parseInt(endTime.split(":")[1])
            ),
            timezone
        );
        return { start, end };
    });
}
