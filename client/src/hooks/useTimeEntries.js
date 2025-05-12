import { useState, useEffect } from 'react';
import axios from 'axios';

const daysOfWeek = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

function getWeekRange(date) {
  // Returns [monday, sunday] as ISO strings
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return [monday.toISOString(), sunday.toISOString()];
}

export default function useTimeEntries({ userId, weekStart }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !weekStart) return;
    setLoading(true);
    setError(null);
    const [startDate, endDate] = getWeekRange(weekStart);
    axios.get('/api/time-entries', {
      params: {
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
      }
    })
      .then(res => {
        const entries = res.data;
        console.log('Fetched time entries:', entries);
        // Group by project
        const grouped = {};
        entries.forEach(entry => {
          if (!grouped[entry.project_id]) {
            grouped[entry.project_id] = {
              project_id: entry.project_id,
              project_name: entry.project_name,
              hours: { mon: { id: null, value: '' }, tue: { id: null, value: '' }, wed: { id: null, value: '' }, thu: { id: null, value: '' }, fri: { id: null, value: '' }, sat: { id: null, value: '' }, sun: { id: null, value: '' } },
            };
          }
          const date = new Date(entry.start_time);
          const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0=Sun, 1=Mon...
          const dayKey = daysOfWeek[dayIdx].key;
          const hours = (new Date(entry.end_time) - new Date(entry.start_time)) / (1000 * 60 * 60);
          grouped[entry.project_id].hours[dayKey] = { id: entry.id, value: hours };
        });
        const result = Object.values(grouped);
        console.log('Transformed weekly entries:', result);
        setProjects(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [userId, weekStart]);

  return { projects, loading, error };
} 