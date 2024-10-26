import { DAYS_OF_WEEK_IN_ORDER } from "@/data/constants";
import { timeToIn } from "@/lib/utils";
import { z } from "zod";

export const scheduleFormSchema = z.object({
    timezone: z.string().min(1, "Required"),
    availabilities: z.array(z.object({
        dayOfWeek: z.enum(DAYS_OF_WEEK_IN_ORDER),
        startTime: z
            .string()
            .regex(
                /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 
                "Time must be in the format HH:MM"
            ),
        endTime: z
        .string()
        .regex(
            /^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, 
            "Time must be in the format HH:MM"
        ),
    })).superRefine((availabilties, ctx) => {
        availabilties.forEach((availability, index) => {
           const overlaps = availabilties.some((a, i) => {
                return i !== index && a.dayOfWeek === availability.dayOfWeek &&
                timeToIn(a.startTime) < timeToIn(availability.endTime) && 
                timeToIn(a.endTime) > timeToIn(availability.startTime)
           }) 
           
           if (overlaps) {
            ctx.addIssue({
                code: "custom",
                message: "Availability overlaps with another",
                path: [index],
            })
           }

           if (timeToIn(availability.startTime) >= timeToIn(availability.endTime)) {
            ctx.addIssue({
                code: "custom",
                message: "End time must be after the start time",
                path: [index]
            })
           }
        })
    }),
})
