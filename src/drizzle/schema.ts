import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { relations } from "drizzle-orm";
import { integer, boolean, pgTable, text, uuid, timestamp, index, pgEnum} from "drizzle-orm/pg-core";

const createdAt = timestamp("createdAt").notNull().defaultNow()
const updatedAt = timestamp("updatedAt").notNull().defaultNow().$onUpdate(()=>new Date())

export const EventTable = pgTable("events", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    durationInMinutes: integer("durationInMinutes").notNull(),
    clerkUserId: text("clerkUserId").notNull(), 
    isActive: boolean("isActive").notNull().default(true),
    createdAt,
    updatedAt
}, table => ({
    clerkUserIdIndex: index("clerkUserIdIndex").on(table.clerkUserId)
}))

export const ScheduleTable = pgTable("schedules", {
    id: uuid("id").primaryKey().defaultRandom(),
    timezone: text("timezone").notNull(),
    clerkUserId: text("clerkUserId").notNull().unique(),
    createdAt,
    updatedAt,
})

export const scheduleRelations = relations(ScheduleTable, ({many})=> ({
    availabilities: many(scheduleAvailabilityTable)
})
)

export const scheduleDayOfWeekEnum =  pgEnum("day", DAYS_OF_WEEK_IN_ORDER)

export const scheduleAvailabilityTable = pgTable("scheduleAvailabilities", {
    id: uuid("id").primaryKey().defaultRandom(),
    scheduleId: uuid("sheduleId").notNull().references(()=> ScheduleTable.id, {onDelete: "cascade" }),
    startTime: text("startTime").notNull(),
    endTime: text("endTime").notNull(),
    dayOfWeek: scheduleDayOfWeekEnum("dayOfWeek").notNull(),
},
table => ({
    scheduleIdIndex: index("scheduleIdIndex").on(table.scheduleId),
})
)

export const scheduleAvailabilityTableRelations = relations(scheduleAvailabilityTable, ({one})=> ({
    schedule: one(ScheduleTable, {
        fields: [scheduleAvailabilityTable.scheduleId],
        references: [ScheduleTable.id]
    })
}))