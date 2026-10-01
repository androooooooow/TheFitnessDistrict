import { localDate, addDays, plans, accessEnd, rateFor } from './domain';

export function createSeed() {
  const today = localDate();
  const people = [
    ['Alex Morgan', 'alex.morgan@example.com', 'monthly'],
    ['Sofia Reyes', 'sofia.reyes@example.com', 'monthly'],
    ['Daniel Cruz', 'daniel.cruz@example.com', 'quarterly'],
    ['Isabella Santos', 'isabella.santos@example.com', 'monthly'],
    ['Miguel Garcia', 'miguel.garcia@example.com', 'half-year'],
    ['Emma Wilson', 'emma.wilson@example.com', 'monthly'],
    ['James Navarro', 'james.navarro@example.com', 'day'],
    ['Olivia Lim', 'olivia.lim@example.com', 'monthly'],
    ['Lucas Tan', 'lucas.tan@example.com', 'annual'],
    ['Chloe Rivera', 'chloe.rivera@example.com', 'monthly'],
    ['Ethan Ramos', 'ethan.ramos@example.com', 'monthly'],
    ['Mia Torres', 'mia.torres@example.com', 'monthly'],
  ];
  const members = people.map(([name, email, planId], i) => ({
    id: `m${i + 1}`,
    code: `FD-${1001 + i}`,
    name,
    email,
    phone: `0917 555 ${String(1001 + i)}`,
    joined: addDays(today, -60 + i * 4),
    status: 'enabled',
    color: i % 6,
    history: [],
    access:
      i === 10
        ? null
        : {
            id: `a${i + 1}`,
            planId,
            status: i === 11 ? 'suspended' : 'active',
            start: addDays(
              today,
              i === 6 ? 0 : i === 7 ? -32 : i === 1 ? -27 : i === 3 ? -25 : -15,
            ),
            end: accessEnd(
              addDays(today, i === 6 ? 0 : i === 7 ? -32 : i === 1 ? -27 : i === 3 ? -25 : -15),
              plans.find((p) => p.id === planId),
            ),
            sessions: planId === 'day' ? 1 : null,
            totalSessions: planId === 'day' ? 1 : null,
            rateCategory: i % 2 === 0 ? 'student' : 'nonStudent',
            listedRate: rateFor(planId, i % 2 === 0 ? 'student' : 'nonStudent', 'afternoon'),
            timeSlot: planId === 'day' ? 'afternoon' : null,
          },
  }));
  const visits = [];
  for (let d = 13; d >= 1; d--) {
    const date = addDays(today, -d);
    for (let j = 0; j < 3 + ((d * 7) % 6); j++) {
      const member = members[(d + j) % 6];
      visits.push({
        id: `v-${d}-${j}`,
        memberId: member.id,
        accessId: member.access.id,
        in: `${date}T${String(7 + j).padStart(2, '0')}:15:00+08:00`,
        out: `${date}T${String(8 + j).padStart(2, '0')}:30:00+08:00`,
      });
    }
  }
  const now = Date.now();
  [0, 1, 2, 3, 4, 5].forEach((idx, j) => {
    const member = members[idx];
    const inTime = new Date(now - (j + 1) * 24 * 60000).toISOString();
    // Include current occupants and completed visits using the actual clock.
    visits.push({
      id: `today-${j}`,
      memberId: member.id,
      accessId: member.access.id,
      in: inTime,
      out: j < 3 ? null : new Date(now - (j - 2) * 10 * 60000).toISOString(),
    });
  });
  const progress = [];
  members.slice(0, 6).forEach((member, i) => {
    [42, 35, 28, 21, 14, 7, 0].forEach((days, index) => {
      progress.push({
        id: `p-${i}-${index}`,
        memberId: member.id,
        metric: 'Weight',
        value: 78 + i * 2 - index * 0.6,
        unit: 'kg',
        date: addDays(today, -days),
        notes: index === 6 ? 'Feeling stronger and more consistent.' : '',
        author: 'admin',
      });
      progress.push({
        id: `b-${i}-${index}`,
        memberId: member.id,
        metric: 'Bench press',
        value: 35 + i * 2 + index * 2.5,
        unit: 'kg',
        date: addDays(today, -days),
        notes: 'Best working weight, 8 repetitions.',
        author: 'admin',
      });
    });
  });
  return {
    version: 1,
    members,
    visits: visits.sort((a, b) => new Date(b.in) - new Date(a.in)),
    progress,
    goals: [{ id: 'g1', memberId: 'm1', metric: 'Bench press', target: 60, unit: 'kg' }],
    settings: {
      name: 'The Fit District',
      email: 'hello@fitnessdistrict.example',
      phone: '0917 555 0100',
    },
  };
}
