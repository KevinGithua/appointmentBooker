import { MeetingForm } from "@/components/forms/MeeetingForm";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { db } from "@/drizzle/db"
import { getValidTimesFromSchedule } from "@/lib/getValidTimesFromSchedule";
import { clerkClient } from "@clerk/nextjs/server";
import { addMonths, eachMinuteOfInterval, endOfDay, roundToNearestMinutes } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0

export default async function BookEventPage({
    params: {clerkUserId, eventId},
}: {
    params: {clerkUserId: string; eventId: string}
}) {
    const event = await db.query.EventTable.findFirst({
        where: ({clerkUserId: userIdCol, isActive, id}, 
            {eq, and}) => and(eq(isActive, true), 
            eq(userIdCol, clerkUserId),
            eq(id, eventId)),
    })

    if (event == null) return notFound()

    const calendarUser = await clerkClient().users.getUser(clerkUserId)

    const startDate = roundToNearestMinutes(new Date(), {
        nearestTo: 15,
        roundingMethod: "ceil"
    })
    const endDate = endOfDay(addMonths(startDate, 2))

    const validTimes = await getValidTimesFromSchedule(
        eachMinuteOfInterval({start: startDate, end: endDate}, {
            step: 15
        }),
        event
    )

    if (validTimes.length === 0) {
        return <NoTimeSlots event={event} calendarUser={calendarUser} />
    }

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>
                    Book {event.name} with {calendarUser.fullName}
                </CardTitle>
                {event.description && (
                    <CardDescription>
                        {event.description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <MeetingForm
                    validTimes={validTimes}
                    eventId={eventId}
                    clerkUserId={clerkUserId} 
                />
            </CardContent>
        </Card>
    )
}

function NoTimeSlots({
    event, calendarUser,
}: {
    event: {name: string; description: string | null }
    calendarUser: {id: string; fullName: string | null}
}) {
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>
                    {event.name} with {calendarUser.fullName}
                </CardTitle>
                {event.description && (
                    <CardDescription>
                        {event.description}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {calendarUser.fullName} is currently booked up. Please Check back later
                or choose a shorter event
            </CardContent>
            <CardFooter className="flex justify-end gap-2 mt-auto">
                <Button asChild>
                    <Link href={`/book/${calendarUser.id}`}> Choose Another Event </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
