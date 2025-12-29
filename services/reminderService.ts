import { supabase } from '../services/supabase';

export interface Reminder {
    id: string;
    title: string;
    startTime: Date;
    contactName?: string;
}

export const checkUpcomingReminders = async (): Promise<Reminder[]> => {
    if (!supabase) return [];

    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60 * 1000); // Check for events in the next hour

    try {
        const { data, error } = await supabase
            .from('events')
            .select('*, contact:contacts(first_name, last_name)')
            .gte('start_time', now.toISOString())
            .lte('start_time', soon.toISOString())
            .eq('is_completed', false);

        if (error) throw error;

        const reminders: Reminder[] = [];

        (data || []).forEach(event => {
            const startTime = new Date(event.start_time);
            const reminderTime = new Date(startTime.getTime() - (event.reminder_minutes || 0) * 60 * 1000);

            // If we are past the reminder time but before the event start time
            if (now >= reminderTime && now < startTime) {
                // Here we could also check if we already notified for this event (using localStorage)
                const cacheKey = `notified_event_${event.id}`;
                if (!localStorage.getItem(cacheKey)) {
                    reminders.push({
                        id: event.id,
                        title: event.title,
                        startTime,
                        contactName: event.contact ? `${event.contact.first_name} ${event.contact.last_name}` : undefined
                    });
                    localStorage.setItem(cacheKey, 'true');
                }
            }
        });

        return reminders;
    } catch (err) {
        console.error("Reminder check failed:", err);
        return [];
    }
};
