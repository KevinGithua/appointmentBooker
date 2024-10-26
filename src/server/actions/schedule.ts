"use server"

import { db } from "@/drizzle/db"
import { scheduleAvailabilityTable, ScheduleTable } from "@/drizzle/schema"
import { scheduleFormSchema } from "@/schema/schedule"
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { BatchItem } from "drizzle-orm/batch"
import "use-server"
import { z } from "zod"

export async function saveSchedule(unsafeData: z.infer<typeof scheduleFormSchema>) {
    const {userId} = auth()
    const {success, data} = scheduleFormSchema.safeParse(unsafeData)

    if(!success || userId == null) {
        return {error: true}
    }

    const {availabilities, ...scheduleData} = data

    const [{id: scheduleId }] = await db
        .insert(ScheduleTable)
        .values({ ...scheduleData, clerkUserId: userId})
        .onConflictDoUpdate({
            target: ScheduleTable.clerkUserId,
            set: scheduleData,
        }).returning({ id: ScheduleTable.id })

    const statements: [BatchItem<"pg">] = [
        db.delete(scheduleAvailabilityTable).where(eq(scheduleAvailabilityTable.scheduleId, scheduleId)),
    ]

    if(availabilities.length > 0) {
        statements.push(db.insert(scheduleAvailabilityTable).values(
            availabilities.map(availabilities => ({
                ...availabilities,
                scheduleId,
            }))
        ))
    }

    await db.batch(statements)
}