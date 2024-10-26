import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventForm } from "@/components/forms/EventForm";

export default function NewEventPage() {
    return (
        <Card className="max-w-md mx-auto">
            <CardHeader>
                <CardTitle>New Event</CardTitle>
            </CardHeader>
            <CardContent>
                <EventForm />
            </CardContent>
        </Card>
    )
}