'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Doc } from '../../../convex/_generated/dataModel';

export type ActivityType = 'announcements' | 'poll' | 'voting';
type AnnouncementDoc = Doc<'announcements'>;

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  announcements: 'Announcement',
  poll: 'Poll',
  voting: 'Voting',
};

export function AnnouncementForm({
  activityType = 'announcements',
  existingActivity = null,
}: {
  activityType?: ActivityType;
  existingActivity?: AnnouncementDoc | null;
}) {
  const router = useRouter();
  const createAnnouncement = useMutation(api.announcements.create);
  const updateAnnouncement = useMutation(api.announcements.update);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState<string>('');
  const [time, setTime] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [autoDeleteEnabled, setAutoDeleteEnabled] = React.useState(false);
  const [deleteDate, setDeleteDate] = React.useState('');
  const [deleteTime, setDeleteTime] = React.useState('');
  const [autoArchiveEnabled, setAutoArchiveEnabled] = React.useState(false);
  const [archiveDate, setArchiveDate] = React.useState('');
  const [archiveTime, setArchiveTime] = React.useState('');
  const [pollOptions, setPollOptions] = React.useState<string[]>(['', '']);
  const [pollAnonymous, setPollAnonymous] = React.useState(false);
  const [pollAllowAdditionalOptions, setPollAllowAdditionalOptions] =
    React.useState(false);
  const [pollMaxSelections, setPollMaxSelections] = React.useState(1);
  const [pollHasClose, setPollHasClose] = React.useState(false);
  const [pollCloseDate, setPollCloseDate] = React.useState('');
  const [pollCloseTime, setPollCloseTime] = React.useState('');

  const todayLocalISO = React.useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const ensureMinimumPollOptions = React.useCallback((options: string[]) => {
    const next = options.length > 0 ? [...options] : ['', ''];
    while (next.length < 2) {
      next.push('');
    }
    return next;
  }, []);

  const handlePollOptionChange = React.useCallback((index: number, value: string) => {
    setPollOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const handleAddPollOption = React.useCallback(() => {
    setPollOptions((prev) => [...prev, '']);
  }, []);

  const handleRemovePollOption = React.useCallback((index: number) => {
    setPollOptions((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const applyExistingValues = React.useCallback((activity: AnnouncementDoc) => {
    setTitle(activity.title);
    setDescription(activity.description);
    const publishDate = new Date(activity.publishAt);
    const isoDate = publishDate.toISOString().slice(0, 10);
    const timeStr = `${String(publishDate.getHours()).padStart(2, '0')}:${String(publishDate.getMinutes()).padStart(2, '0')}`;
    setDate(isoDate);
    setTime(timeStr);

    if (typeof activity.autoDeleteAt === 'number') {
      const deleteAt = new Date(activity.autoDeleteAt);
      const deleteIso = deleteAt.toISOString().slice(0, 10);
      const deleteTimeStr = `${String(deleteAt.getHours()).padStart(2, '0')}:${String(deleteAt.getMinutes()).padStart(2, '0')}`;
      setAutoDeleteEnabled(true);
      setDeleteDate(deleteIso);
      setDeleteTime(deleteTimeStr);
    } else {
      setAutoDeleteEnabled(false);
      setDeleteDate('');
      setDeleteTime('');
    }

    if (typeof activity.autoArchiveAt === 'number') {
      const archiveAt = new Date(activity.autoArchiveAt);
      const archiveIso = archiveAt.toISOString().slice(0, 10);
      const archiveTimeStr = `${String(archiveAt.getHours()).padStart(2, '0')}:${String(archiveAt.getMinutes()).padStart(2, '0')}`;
      setAutoArchiveEnabled(true);
      setArchiveDate(archiveIso);
      setArchiveTime(archiveTimeStr);
      // Ensure only one automation is active
      setAutoDeleteEnabled(false);
      setDeleteDate('');
      setDeleteTime('');
    } else {
      setAutoArchiveEnabled(false);
      setArchiveDate('');
      setArchiveTime('');
    }

    if (activity.eventType === 'poll') {
      setTitle(activity.pollQuestion ?? activity.title ?? '');
      const options = Array.isArray(activity.pollOptions)
        ? activity.pollOptions.map((option) => option ?? '')
        : ['', ''];
      setPollOptions(ensureMinimumPollOptions(options));
      setPollAnonymous(Boolean(activity.pollAnonymous));
      setPollAllowAdditionalOptions(
        Boolean(activity.pollAllowAdditionalOptions),
      );
      setPollMaxSelections(
        Math.max(
          1,
          Math.floor(activity.pollMaxSelections ?? 1),
        ),
      );
      if (typeof activity.pollClosesAt === 'number') {
        const closeDate = new Date(activity.pollClosesAt);
        setPollHasClose(true);
        setPollCloseDate(closeDate.toISOString().slice(0, 10));
        setPollCloseTime(
          `${String(closeDate.getHours()).padStart(2, '0')}:${String(closeDate.getMinutes()).padStart(2, '0')}`,
        );
      } else {
        setPollHasClose(false);
        setPollCloseDate('');
        setPollCloseTime('');
      }
    } else {
      setPollOptions(['', '']);
      setPollAnonymous(false);
      setPollAllowAdditionalOptions(false);
      setPollMaxSelections(1);
      setPollHasClose(false);
      setPollCloseDate('');
      setPollCloseTime('');
    }
  }, [ensureMinimumPollOptions]);

  const isEditing = Boolean(existingActivity);
  const showSchedulingControls = !isEditing;
  const isScheduled = Boolean(date && time) && showSchedulingControls;
  const activeType =
    (existingActivity?.eventType as ActivityType | undefined) ?? activityType;
  const isPoll = activeType === 'poll';
  const activityLabel = ACTIVITY_LABELS[activeType];
  const buttonLabel = isEditing
    ? 'Save and Publish'
    : isScheduled
      ? `Schedule ${activityLabel}`
      : `Publish ${activityLabel}`;

  React.useEffect(() => {
    setDate((prev) => prev || todayLocalISO);
  }, [todayLocalISO]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!existingActivity) return;
    applyExistingValues(existingActivity);
  }, [existingActivity, applyExistingValues]);

  React.useEffect(() => {
    if (!isPoll) {
      setPollOptions(['', '']);
      setPollAnonymous(false);
      setPollAllowAdditionalOptions(false);
      setPollMaxSelections(1);
      setPollHasClose(false);
      setPollCloseDate('');
      setPollCloseTime('');
    }
  }, [isPoll]);

  React.useEffect(() => {
    if (!isPoll) return;
    const trimmedCount = Math.max(
      1,
      pollOptions.filter((option) => option.trim().length > 0).length,
    );
    setPollMaxSelections((current) => {
      const normalized = Math.max(
        1,
        Math.min(Math.floor(current) || 1, trimmedCount),
      );
      return normalized === current ? current : normalized;
    });
  }, [isPoll, pollOptions]);



  const scheduledDate = React.useMemo(() => {
    if (!date) return null;
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, (m as number) - 1, d);
    return dt.toLocaleDateString(undefined, { dateStyle: 'medium' });
  }, [date]);

  const scheduledSummary = React.useMemo(() => {
    if (!date || !time) return null;
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const dt = new Date(y, (m as number) - 1, d, hh, mm, 0, 0);
    return dt.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [date, time]);

  function combineDateTimeToEpochMs(dateStr: string, timeStr: string): number {
    if (dateStr === todayLocalISO && !timeStr) return Date.now();
    if (!dateStr && !timeStr) return Date.now();

    const now = new Date();
    const [y, m, d] = (
      dateStr ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    )
      .split('-')
      .map(Number);
    const [hh, mm] = timeStr
      ? timeStr.split(':').map(Number)
      : [now.getHours(), now.getMinutes()];
    const local = new Date(y, (m as number) - 1, d, hh, mm, 0, 0);
    return local.getTime();
  }

  const resetForm = React.useCallback(() => {
    setTitle('');
    setDescription('');
    setDate(todayLocalISO);
    setTime('');
    setAutoDeleteEnabled(false);
    setDeleteDate('');
    setDeleteTime('');
    setAutoArchiveEnabled(false);
    setArchiveDate('');
    setArchiveTime('');
    setPollOptions(['', '']);
    setPollAnonymous(false);
    setPollAllowAdditionalOptions(false);
    setPollMaxSelections(1);
    setPollHasClose(false);
    setPollCloseDate('');
    setPollCloseTime('');
  }, [todayLocalISO]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (showSchedulingControls) {
      if (date !== todayLocalISO && !time) {
        setError('Please pick a publish time.');
        return;
      }

      if (date === todayLocalISO && time) {
        const publishAtCandidate = combineDateTimeToEpochMs(date, time);
        if (publishAtCandidate < Date.now()) {
          setError('Publish time cannot be in the past.');
          return;
        }
      }
    }

    const nextPublishAt = showSchedulingControls
      ? combineDateTimeToEpochMs(date, time)
      : Date.now();

    let autoDeleteAtValue: number | null = null;
    if (autoDeleteEnabled) {
      if (!deleteDate || !deleteTime) {
        setError('Please select a delete date and time.');
        return;
      }
      const autoDeleteCandidate = combineDateTimeToEpochMs(
        deleteDate,
        deleteTime
      );
      if (autoDeleteCandidate <= nextPublishAt) {
        setError('Delete time must be after the publish time.');
        return;
      }
      if (autoDeleteCandidate <= Date.now()) {
        setError('Delete time must be in the future.');
        return;
      }
      autoDeleteAtValue = autoDeleteCandidate;
    }

    let autoArchiveAtValue: number | null = null;
    if (autoArchiveEnabled) {
      if (!archiveDate || !archiveTime) {
        setError('Please select an archive date and time.');
        return;
      }
      const autoArchiveCandidate = combineDateTimeToEpochMs(
        archiveDate,
        archiveTime
      );
      if (autoArchiveCandidate <= nextPublishAt) {
        setError('Archive time must be after the publish time.');
        return;
      }
      if (autoArchiveCandidate <= Date.now()) {
        setError('Archive time must be in the future.');
        return;
      }
      autoArchiveAtValue = autoArchiveCandidate;
    }

    if (autoDeleteAtValue !== null && autoArchiveAtValue !== null) {
      setError('Choose either auto delete or auto archive, not both.');
      return;
    }

    let pollQuestionPayload: string | undefined;
    let pollOptionsPayload: string[] | undefined;
    let pollAnonymousPayload: boolean | undefined;
    let pollAllowAdditionalOptionsPayload: boolean | undefined;
    let pollMaxSelectionsPayload: number | undefined;
    let pollClosesAtPayload: number | undefined;
    if (isPoll) {
      const question = title.trim();
      if (!question) {
        setError('Poll question is required.');
        return;
      }
      if (question.length > 100) {
        setError('Poll question must be 100 characters or fewer.');
        return;
      }
      const cleanedOptions = pollOptions.map((option) => option.trim()).filter((option) => option.length > 0);
      if (cleanedOptions.length < 2) {
        setError('Polls require at least two options.');
        return;
      }
      const normalizedMaxSelections = Math.max(
        1,
        Math.min(
          cleanedOptions.length,
          Math.floor(pollMaxSelections) || 1,
        ),
      );
      pollQuestionPayload = question;
      pollOptionsPayload = cleanedOptions;
      pollAnonymousPayload = pollAnonymous;
      pollAllowAdditionalOptionsPayload = pollAllowAdditionalOptions;
      pollMaxSelectionsPayload = normalizedMaxSelections;
      if (pollHasClose) {
        if (!pollCloseDate || !pollCloseTime) {
          setError('Select a poll end date and time.');
          return;
        }
        const pollCloseCandidate = combineDateTimeToEpochMs(
          pollCloseDate,
          pollCloseTime,
        );
        if (pollCloseCandidate <= nextPublishAt) {
          setError('Poll end time must be after the publish time.');
          return;
        }
        pollClosesAtPayload = pollCloseCandidate;
      }
    }

    setSubmitting(true);
    try {
      if (isEditing && existingActivity) {
        const { status } = await updateAnnouncement({
          id: existingActivity._id,
          title,
          description,
          publishAt: nextPublishAt,
          autoDeleteAt: autoDeleteAtValue,
          autoArchiveAt: autoArchiveAtValue,
          pollQuestion: pollQuestionPayload,
          pollOptions: pollOptionsPayload,
          pollAnonymous: pollAnonymousPayload,
          pollAllowAdditionalOptions: pollAllowAdditionalOptionsPayload,
          pollMaxSelections: pollMaxSelectionsPayload,
          pollClosesAt: pollClosesAtPayload ?? null,
          eventType: activeType,
        });
        setSuccess(
          status === 'published'
            ? `${activityLabel} updated and live.`
            : `${activityLabel} update saved.`
        );
      } else {
        const { status } = await createAnnouncement({
          title,
          description,
          publishAt: nextPublishAt,
          autoDeleteAt: autoDeleteAtValue,
          autoArchiveAt: autoArchiveAtValue,
          pollQuestion: pollQuestionPayload,
          pollOptions: pollOptionsPayload,
          pollAnonymous: pollAnonymousPayload,
          pollAllowAdditionalOptions: pollAllowAdditionalOptionsPayload,
          pollMaxSelections: pollMaxSelectionsPayload,
          pollClosesAt: pollClosesAtPayload ?? null,
          eventType: activeType,
        });
        resetForm();
        setSuccess(
          status === 'published'
            ? `${activityLabel} published successfully.`
            : `${activityLabel} scheduled successfully.`
        );
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function onCancel() {
    if (isEditing && existingActivity) {
      router.push('/');
      return;
    }
    resetForm();
    setError(null);
    setSuccess(null);
  }

  const timeSlots = React.useMemo(() => {
    const slots: string[] = [];
    for (let h = 0; h < 24; h += 1) {
      for (const m of [0, 15, 30, 45]) {
        slots.push(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        );
      }
    }
    return slots;
  }, []);

  const slotToMinutes = React.useCallback((slot: string) => {
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m;
  }, []);

  const availableTimeSlotsCore = React.useMemo(() => {
    if (!showSchedulingControls) return timeSlots;
    if (date === todayLocalISO) {
      const current = new Date(now);
      const currentMinutes = current.getHours() * 60 + current.getMinutes();
      return timeSlots.filter((slot) => slotToMinutes(slot) >= currentMinutes);
    }
    return timeSlots;
  }, [date, todayLocalISO, timeSlots, slotToMinutes, now, isEditing]);

  React.useEffect(() => {
    if (isEditing || !time || date !== todayLocalISO) return;
    const current = new Date(now);
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    if (slotToMinutes(time) < currentMinutes) {
      setTime('');
    }
  }, [time, date, todayLocalISO, now, slotToMinutes, isEditing]);

  const displayTimeSlots = React.useMemo(() => {
    if (time && !availableTimeSlotsCore.includes(time)) {
      return [time, ...availableTimeSlotsCore];
    }
    return availableTimeSlotsCore;
  }, [time, availableTimeSlotsCore]);

  const autoDeleteSummary = React.useMemo(() => {
    if (!autoDeleteEnabled || !deleteDate || !deleteTime) return null;
    const [y, m, d] = deleteDate.split('-').map(Number);
    const [hh, mm] = deleteTime.split(':').map(Number);
    const dt = new Date(y, (m as number) - 1, d, hh, mm, 0, 0);
    return dt.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [autoDeleteEnabled, deleteDate, deleteTime]);

  const minAutoDeleteDate = React.useMemo(() => {
    if (isEditing) return todayLocalISO;
    return date || todayLocalISO;
  }, [date, todayLocalISO, isEditing]);

  const autoArchiveSummary = React.useMemo(() => {
    if (!autoArchiveEnabled || !archiveDate || !archiveTime) return null;
    const [y, m, d] = archiveDate.split('-').map(Number);
    const [hh, mm] = archiveTime.split(':').map(Number);
    const dt = new Date(y, (m as number) - 1, d, hh, mm, 0, 0);
    return dt.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [autoArchiveEnabled, archiveDate, archiveTime]);

  const minAutoArchiveDate = React.useMemo(() => {
    if (isEditing) return todayLocalISO;
    return date || todayLocalISO;
  }, [date, todayLocalISO, isEditing]);

  const minPollCloseDate = React.useMemo(() => {
    return date || todayLocalISO;
  }, [date, todayLocalISO]);

  React.useEffect(() => {
    if (!pollHasClose || !pollCloseDate) return;
    if (pollCloseDate < minPollCloseDate) {
      setPollCloseDate(minPollCloseDate);
      setPollCloseTime('');
    }
  }, [pollHasClose, pollCloseDate, minPollCloseDate]);

  const availablePollCloseTimeSlots = React.useMemo(() => {
    if (!pollHasClose || !pollCloseDate) return timeSlots;

    const publishDateForGuard =
      showSchedulingControls && date ? date : todayLocalISO;
    const publishMinutes =
      showSchedulingControls && time ? slotToMinutes(time) : null;

    return timeSlots.filter((slot) => {
      const minutes = slotToMinutes(slot);

      if (pollCloseDate === todayLocalISO) {
        const current = new Date(now);
        const currentMinutes = current.getHours() * 60 + current.getMinutes();
        if (minutes <= currentMinutes) {
          return false;
        }
      }

      if (
        showSchedulingControls &&
        publishMinutes !== null &&
        pollCloseDate === publishDateForGuard
      ) {
        if (minutes <= publishMinutes) {
          return false;
        }
      }

      return true;
    });
  }, [
    pollHasClose,
    pollCloseDate,
    timeSlots,
    todayLocalISO,
    now,
    slotToMinutes,
    showSchedulingControls,
    date,
    time,
  ]);

  const displayPollCloseTimeSlots = React.useMemo(() => {
    if (
      pollCloseTime &&
      !availablePollCloseTimeSlots.includes(pollCloseTime)
    ) {
      return [pollCloseTime, ...availablePollCloseTimeSlots];
    }
    return availablePollCloseTimeSlots;
  }, [pollCloseTime, availablePollCloseTimeSlots]);

  const noPollCloseSlotsLeftToday =
    pollHasClose &&
    pollCloseDate === todayLocalISO &&
    availablePollCloseTimeSlots.length === 0;

  React.useEffect(() => {
    if (!pollHasClose || !pollCloseTime) return;
    if (!availablePollCloseTimeSlots.includes(pollCloseTime)) {
      setPollCloseTime('');
    }
  }, [pollHasClose, pollCloseTime, availablePollCloseTimeSlots]);

  const availableDeleteTimeSlots = React.useMemo(() => {
    if (!autoDeleteEnabled || !deleteDate) return timeSlots;

    const publishDateForDeleteGuard =
      showSchedulingControls && date ? date : todayLocalISO;
    const publishMinutes =
      showSchedulingControls && time ? slotToMinutes(time) : null;

    return timeSlots.filter((slot) => {
      const minutes = slotToMinutes(slot);

      if (deleteDate === todayLocalISO) {
        const current = new Date(now);
        const currentMinutes = current.getHours() * 60 + current.getMinutes();
        if (minutes <= currentMinutes) {
          return false;
        }
      }

      if (
        showSchedulingControls &&
        publishMinutes !== null &&
        deleteDate === publishDateForDeleteGuard
      ) {
        if (minutes <= publishMinutes) {
          return false;
        }
      }

      return true;
    });
  }, [
    autoDeleteEnabled,
    deleteDate,
    timeSlots,
    todayLocalISO,
    now,
    slotToMinutes,
    showSchedulingControls,
    date,
    time,
  ]);

  const displayDeleteTimeSlots = React.useMemo(() => {
    if (deleteTime && !availableDeleteTimeSlots.includes(deleteTime)) {
      return [deleteTime, ...availableDeleteTimeSlots];
    }
    return availableDeleteTimeSlots;
  }, [deleteTime, availableDeleteTimeSlots]);

  const noDeleteSlotsLeftToday =
    autoDeleteEnabled &&
    deleteDate === todayLocalISO &&
    availableDeleteTimeSlots.length === 0;

  React.useEffect(() => {
    if (!autoDeleteEnabled || !deleteTime || deleteDate !== todayLocalISO) return;
    const current = new Date(now);
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    if (slotToMinutes(deleteTime) <= currentMinutes) {
      setDeleteTime('');
    }
  }, [autoDeleteEnabled, deleteTime, deleteDate, todayLocalISO, now, slotToMinutes]);

  const availableArchiveTimeSlots = React.useMemo(() => {
    if (!autoArchiveEnabled || !archiveDate) return timeSlots;

    const publishDateForGuard =
      showSchedulingControls && date ? date : todayLocalISO;
    const publishMinutes =
      showSchedulingControls && time ? slotToMinutes(time) : null;

    return timeSlots.filter((slot) => {
      const minutes = slotToMinutes(slot);

      if (archiveDate === todayLocalISO) {
        const current = new Date(now);
        const currentMinutes = current.getHours() * 60 + current.getMinutes();
        if (minutes <= currentMinutes) {
          return false;
        }
      }

      if (
        showSchedulingControls &&
        publishMinutes !== null &&
        archiveDate === publishDateForGuard
      ) {
        if (minutes <= publishMinutes) {
          return false;
        }
      }

      return true;
    });
  }, [
    autoArchiveEnabled,
    archiveDate,
    timeSlots,
    todayLocalISO,
    now,
    slotToMinutes,
    showSchedulingControls,
    date,
    time,
  ]);

  const displayArchiveTimeSlots = React.useMemo(() => {
    if (archiveTime && !availableArchiveTimeSlots.includes(archiveTime)) {
      return [archiveTime, ...availableArchiveTimeSlots];
    }
    return availableArchiveTimeSlots;
  }, [archiveTime, availableArchiveTimeSlots]);

  const noArchiveSlotsLeftToday =
    autoArchiveEnabled &&
    archiveDate === todayLocalISO &&
    availableArchiveTimeSlots.length === 0;

  React.useEffect(() => {
    if (!autoArchiveEnabled || !archiveTime || archiveDate !== todayLocalISO) {
      return;
    }
    const current = new Date(now);
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    if (slotToMinutes(archiveTime) <= currentMinutes) {
      setArchiveTime('');
    }
  }, [
    autoArchiveEnabled,
    archiveTime,
    archiveDate,
    todayLocalISO,
    now,
    slotToMinutes,
  ]);

  const noSlotsLeftToday =
    showSchedulingControls &&
    date === todayLocalISO &&
    availableTimeSlotsCore.length === 0;

  return (
    <form
      className='space-y-6'
      aria-label={`${isEditing ? 'Edit' : 'Create'} ${activityLabel.toLowerCase()} form`}
      onSubmit={onSubmit}
    >
      <div className={`grid gap-4 ${showSchedulingControls ? 'sm:grid-cols-2' : ''}`}>
        <label className='flex flex-col gap-2 text-sm text-foreground'>
          Title
          <input
            type='text'
            name='title'
            placeholder={
              isPoll ? 'Poll question (max 100 characters)' : 'Announcement Title...'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={isPoll ? 100 : undefined}
            className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          />
        </label>

        {showSchedulingControls && (
          <div className='grid grid-cols-2 gap-4'>
            <label className='flex flex-col gap-2 text-sm text-foreground'>
              Publish Date
              <input
                type='date'
                name='publishDate'
                value={date}
                min={todayLocalISO}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setDate(nextDate);
                  if (autoDeleteEnabled) {
                    setDeleteDate('');
                    setDeleteTime('');
                  }
                  if (autoArchiveEnabled) {
                    setArchiveDate('');
                    setArchiveTime('');
                  }
                }}
                className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              />
            </label>

            <label className='flex flex-col gap-2 text-sm text-foreground'>
              Publish Time (15 min slots)
              <select
                name='publishTime'
                value={time}
                onChange={(e) => {
                  const nextTime = e.target.value;
                  setTime(nextTime);
                  if (autoDeleteEnabled) {
                    setDeleteDate('');
                    setDeleteTime('');
                  }
                  if (autoArchiveEnabled) {
                    setArchiveDate('');
                    setArchiveTime('');
                  }
                }}
                required={date !== todayLocalISO}
                disabled={noSlotsLeftToday}
                className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70'
              >
                <option value=''>--</option>
                {noSlotsLeftToday ? (
                  <option value='' disabled>
                    No slots remain today — pick another date
                  </option>
                ) : (
                  displayTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        )}
      </div>

      <label className='flex flex-col gap-2 text-sm text-foreground'>
        Description
        <textarea
          name='description'
          rows={4}
          placeholder='Details...'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required={!isPoll}
          className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        />
      </label>

      {isPoll && (
        <>
          <div className='space-y-3 rounded-2xl border border-border bg-card/70 p-4'>
            <p className='text-sm font-medium text-foreground'>Poll Options</p>
            {pollOptions.map((option, index) => (
              <div className='flex items-center gap-2' key={`poll-option-${index}`}>
                <input
                  type='text'
                  value={option}
                  onChange={(e) => handlePollOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className='flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                />
                {index >= 2 && (
                  <button
                    type='button'
                    onClick={() => handleRemovePollOption(index)}
                    className='inline-flex items-center justify-center rounded-md border border-border bg-secondary p-2 text-foreground hover:opacity-90'
                    aria-label={`Delete poll option ${index + 1}`}
                  >
                    <Trash2 className='h-4 w-4 text-destructive' aria-hidden='true' />
                  </button>
                )}
              </div>
            ))}
            <button
              type='button'
              onClick={handleAddPollOption}
              className='inline-flex items-center justify-center rounded-md border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground hover:opacity-90'
            >
              Add Option
            </button>
          </div>

          <div className='space-y-3 rounded-2xl border border-border bg-card/70 p-4'>
            <p className='text-sm font-medium text-foreground'>Poll Settings</p>
            <label className='flex items-center gap-2 text-sm text-foreground'>
              <input
                type='checkbox'
                checked={pollAnonymous}
                onChange={(event) => setPollAnonymous(event.target.checked)}
                className='h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              />
              Anonymous voting
            </label>
            <p className='text-xs text-muted-foreground'>
              When enabled, only admins can see the vote totals. Everyone else sees only their own selections.
            </p>

            <label className='flex items-center gap-2 text-sm text-foreground'>
              <input
                type='checkbox'
                checked={pollAllowAdditionalOptions}
                onChange={(event) =>
                  setPollAllowAdditionalOptions(event.target.checked)
                }
                className='h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              />
              Allow additional options from users
            </label>
            <p className='text-xs text-muted-foreground'>
              If enabled, users can submit their own option when voting.
            </p>

            <label className='flex flex-col gap-2 text-sm text-foreground'>
              Number of selections
              <input
                type='number'
                min={1}
                max={Math.max(1, pollOptions.filter((option) => option.trim().length > 0).length)}
                value={pollMaxSelections}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setPollMaxSelections(Number.isNaN(value) ? 1 : value);
                }}
                className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              />
            </label>
            <p className='text-xs text-muted-foreground'>
              Users can select up to this many options when voting.
            </p>

            <label className='flex items-center gap-2 text-sm text-foreground'>
              <input
                type='checkbox'
                checked={pollHasClose}
                onChange={(event) => {
                  const enabled = event.target.checked;
                  setPollHasClose(enabled);
                  if (enabled) {
                    const defaultDate = date || todayLocalISO;
                    setPollCloseDate((prev) => prev || defaultDate);
                    setPollCloseTime((prev) => prev || time || '');
                  } else {
                    setPollCloseDate('');
                    setPollCloseTime('');
                  }
                }}
                className='h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              />
              Set poll end time
            </label>
            <p className='text-xs text-muted-foreground'>
              After this time passes, the poll becomes read-only and no additional votes can be submitted.
            </p>

            {pollHasClose && (
              <div className='grid grid-cols-2 gap-4'>
                <label className='flex flex-col gap-2 text-sm text-foreground'>
                  End Date
                  <input
                    type='date'
                    value={pollCloseDate}
                    min={minPollCloseDate}
                    onChange={(event) => setPollCloseDate(event.target.value)}
                    className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                  />
                </label>
                <label className='flex flex-col gap-2 text-sm text-foreground'>
                  End Time (15 min slots)
                  <select
                    value={pollCloseTime}
                    onChange={(event) => setPollCloseTime(event.target.value)}
                    disabled={noPollCloseSlotsLeftToday}
                    className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70'
                  >
                    <option value=''>--</option>
                    {noPollCloseSlotsLeftToday ? (
                      <option value='' disabled>
                        No times remain today — pick another date
                      </option>
                    ) : (
                      displayPollCloseTimeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            )}
          </div>
        </>
      )}

      <div className='space-y-3 rounded-2xl border border-border bg-card/70 p-4'>
        <label className='flex items-center gap-3 text-sm font-medium text-foreground'>
          <input
            type='checkbox'
            checked={autoDeleteEnabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              setAutoDeleteEnabled(enabled);
              if (enabled) {
                setAutoArchiveEnabled(false);
                setArchiveDate('');
                setArchiveTime('');
                const defaultDeleteDate = showSchedulingControls
                  ? date || todayLocalISO
                  : todayLocalISO;
                setDeleteDate((prev) => prev || defaultDeleteDate);
                setDeleteTime((prev) => prev || time || '');
              } else {
                setDeleteDate('');
                setDeleteTime('');
              }
            }}
            className='h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          />
          Auto Delete
        </label>
        <p className='text-xs text-muted-foreground'>
          Automatically remove the activity at a future date.
        </p>

        {autoDeleteEnabled && (
          <div className='grid grid-cols-2 gap-4'>
            <label className='flex flex-col gap-2 text-sm text-foreground'>
              Delete Date
              <input
                type='date'
                name='deleteDate'
                value={deleteDate}
                min={minAutoDeleteDate}
                onChange={(e) => setDeleteDate(e.target.value)}
                required
                className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              />
            </label>

            <label className='flex flex-col gap-2 text-sm text-foreground'>
              Delete Time (15 min slots)
              <select
                name='deleteTime'
                value={deleteTime}
                onChange={(e) => setDeleteTime(e.target.value)}
                required
                disabled={noDeleteSlotsLeftToday}
                className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70'
              >
                <option value=''>--</option>
                {noDeleteSlotsLeftToday ? (
                  <option value='' disabled>
                    No delete slots remain today — pick another date
                  </option>
                ) : (
                  displayDeleteTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        )}

        {autoDeleteEnabled && (
          <p className='text-xs text-muted-foreground'>
            {autoDeleteSummary
              ? `Will delete on ${autoDeleteSummary}.`
              : 'Pick a delete date and time to enable auto removal.'}
          </p>
        )}
      </div>

      <div className='space-y-3 rounded-2xl border border-border bg-card/70 p-4'>
        <label className='flex items-center gap-3 text-sm font-medium text-foreground'>
          <input
            type='checkbox'
            checked={autoArchiveEnabled}
            onChange={(event) => {
              const enabled = event.target.checked;
              setAutoArchiveEnabled(enabled);
              if (enabled) {
                setAutoDeleteEnabled(false);
                setDeleteDate('');
                setDeleteTime('');
                const defaultArchiveDate = showSchedulingControls
                  ? date || todayLocalISO
                  : todayLocalISO;
                setArchiveDate((prev) => prev || defaultArchiveDate);
                setArchiveTime((prev) => prev || time || '');
              } else {
                setArchiveDate('');
                setArchiveTime('');
              }
            }}
            className='h-4 w-4 rounded border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          />
          Auto Archive
        </label>
        <p className='text-xs text-muted-foreground'>
          Archive the activity automatically instead of deleting it.
        </p>

        {autoArchiveEnabled && (
          <div className='grid grid-cols-2 gap-4'>
            <label className='flex flex-col gap-2 text-sm text-foreground'>
              Archive Date
              <input
                type='date'
                name='archiveDate'
                value={archiveDate}
                min={minAutoArchiveDate}
                onChange={(e) => setArchiveDate(e.target.value)}
                required
                className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
              />
            </label>

            <label className='flex flex-col gap-2 text-sm text-foreground'>
              Archive Time (15 min slots)
              <select
                name='archiveTime'
                value={archiveTime}
                onChange={(e) => setArchiveTime(e.target.value)}
                required
                disabled={noArchiveSlotsLeftToday}
                className='rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70'
              >
                <option value=''>--</option>
                {noArchiveSlotsLeftToday ? (
                  <option value='' disabled>
                    No archive slots remain today — pick another date
                  </option>
                ) : (
                  displayArchiveTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        )}

        {autoArchiveEnabled && (
          <p className='text-xs text-muted-foreground'>
            {autoArchiveSummary
              ? `Will archive on ${autoArchiveSummary}.`
              : 'Pick an archive date and time to auto archive.'}
          </p>
        )}
      </div>

      <div className='flex items-center justify-between gap-3'>
        <p className='text-xs text-muted-foreground'>
          {isEditing
            ? 'Changes will publish immediately.'
            : date === todayLocalISO && !time
                ? 'No time selected — will publish immediately.'
                : isScheduled && scheduledSummary
                  ? `Scheduled for ${scheduledSummary}`
                  : `Scheduled for ${scheduledDate} - select a publish time.`}
        </p>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={onCancel}
            disabled={submitting}
            className='inline-flex items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:opacity-90 disabled:opacity-60'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={submitting}
            className='inline-flex items-center justify-center rounded-md border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60'
          >
            {submitting ? 'Saving...' : buttonLabel}
          </button>
        </div>
      </div>

      {error && (
        <div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
          {error}
        </div>
      )}
      {success && (
        <div className='rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500'>
          {success}
        </div>
      )}
    </form>
  );
}
