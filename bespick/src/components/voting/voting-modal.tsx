'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { X, Search } from 'lucide-react';
import type { Doc } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import { formatDate, formatEventType } from '@/lib/announcements';

type Announcement = Doc<'announcements'>;

type VotingModalProps = {
  event: Announcement;
  onClose: () => void;
};

type VoteSelection = {
  add: number;
  remove: number;
};

export function VotingModal({ event, onClose }: VotingModalProps) {
  const normalizeParticipants = React.useCallback(() => {
    return (event.votingParticipants ?? []).map((participant) => ({
      ...participant,
      votes:
        typeof participant.votes === 'number' &&
        Number.isFinite(participant.votes)
          ? Math.max(0, participant.votes)
          : 0,
    }));
  }, [event.votingParticipants]);

  const [participants, setParticipants] = React.useState(normalizeParticipants);
  const addPrice = Math.max(0, event.votingAddVotePrice ?? 0);
  const removePrice = Math.max(0, event.votingRemoveVotePrice ?? 0);
  const [selections, setSelections] = React.useState<Record<string, VoteSelection>>({});
  const [search, setSearch] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const purchaseVotes = useMutation(api.announcements.purchaseVotes);

  React.useEffect(() => {
    setParticipants(normalizeParticipants());
    setSelections({});
    setSearch('');
    setStatusMessage(null);
    setErrorMessage(null);
  }, [normalizeParticipants]);

  const adjustSelection = React.useCallback(
    (
      userId: string,
      type: 'add' | 'remove',
      delta: number,
      limit?: number,
    ) => {
      if (!userId) return;
      setSelections((prev) => {
        const next = { ...prev };
        const current = next[userId] ?? { add: 0, remove: 0 };
        if (type === 'remove' && delta > 0 && typeof limit === 'number') {
          if (current.remove >= limit) {
            return prev;
          }
        }
        const updatedValue = Math.max(0, current[type] + delta);
        if (
          type === 'remove' &&
          typeof limit === 'number' &&
          updatedValue > limit
        ) {
          return prev;
        }
        const updated = { ...current, [type]: updatedValue };
        if (updated.add === 0 && updated.remove === 0) {
          delete next[userId];
        } else {
          next[userId] = updated;
        }
        return next;
      });
    },
    [],
  );

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const totals = React.useMemo(() => {
    const sums = Object.values(selections).reduce(
      (acc, entry) => {
        acc.add += entry.add;
        acc.remove += entry.remove;
        return acc;
      },
      { add: 0, remove: 0 },
    );
    const addCost = sums.add * addPrice;
    const removeCost = sums.remove * removePrice;
    const totalPrice = addCost + removeCost;
    return { ...sums, addCost, removeCost, totalPrice };
  }, [selections, addPrice, removePrice]);

  const hasCart = totals.add + totals.remove > 0;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredParticipants = React.useMemo(() => {
    if (!normalizedSearch) return participants;
    return participants.filter((participant) => {
      const fullName = `${participant.firstName ?? ''} ${participant.lastName ?? ''}`
        .trim()
        .toLowerCase();
      return fullName.includes(normalizedSearch);
    });
  }, [participants, normalizedSearch]);

  const handleCheckout = React.useCallback(async () => {
    const adjustments = Object.entries(selections)
      .map(([userId, selection]) => ({
        userId,
        add: selection.add,
        remove: selection.remove,
      }))
      .filter((entry) => entry.add > 0 || entry.remove > 0);

    if (!adjustments.length) return;

    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const result = await purchaseVotes({
        id: event._id,
        adjustments,
      });
      if (result.success && Array.isArray(result.participants)) {
        setParticipants(
          result.participants.map((participant) => ({
            ...participant,
            votes:
              typeof participant.votes === 'number' &&
              Number.isFinite(participant.votes)
                ? Math.max(0, participant.votes)
                : 0,
          })),
        );
        setSelections({});
        setStatusMessage('Votes updated successfully.');
      } else {
        setStatusMessage('No changes to submit.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit votes.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }, [selections, purchaseVotes, event._id]);

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6'>
      <div className='w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wide text-primary'>
              {formatEventType(event.eventType)}
            </p>
            <h2 className='mt-1 text-2xl font-semibold text-foreground'>{event.title}</h2>
            <p className='mt-1 text-xs text-muted-foreground'>
              Published {formatDate(event.publishAt)}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-full border border-border p-2 text-muted-foreground transition hover:text-foreground'
            aria-label='Close voting modal'
          >
            <X className='h-4 w-4' />
          </button>
        </div>

        {event.description && (
          <p className='mt-4 text-sm leading-relaxed text-foreground'>
            {event.description}
          </p>
        )}

        <div className='mt-6 rounded-xl border border-border bg-background/60 p-4'>
          <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
            <span>
              Add vote price:{' '}
              <span className='font-semibold text-foreground'>${addPrice.toFixed(2)}</span>
            </span>
            <span>
              Remove vote price:{' '}
              <span className='font-semibold text-foreground'>${removePrice.toFixed(2)}</span>
            </span>
            <span>
              Participants: {filteredParticipants.length} / {participants.length}
            </span>
          </div>
          <p className='mt-2 text-xs text-muted-foreground'>
            Tap plus/minus to build a cart for adding or removing votes, then submit your purchase to update totals.
          </p>
        </div>

        <div className='mt-6 flex flex-col gap-3'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <input
              type='search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search participants by name...'
              className='w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            />
          </div>

          <div className='max-h-[40vh] overflow-y-auto rounded-xl border border-dashed border-border'>
            {participants.length === 0 ? (
              <p className='p-6 text-sm text-muted-foreground'>
                No participants available for this event.
              </p>
            ) : filteredParticipants.length === 0 ? (
              <p className='p-6 text-sm text-muted-foreground'>
                No participants match your search.
              </p>
            ) : (
              <ul>
                {filteredParticipants.map((participant) => {
                  const userId = participant.userId;
                  const addCount = selections[userId]?.add ?? 0;
                  const removeCount = selections[userId]?.remove ?? 0;
                  const currentVotes = Math.max(0, participant.votes ?? 0);
                  const remainingRemovals = Math.max(0, currentVotes - removeCount);
                  const fullName = `${participant.firstName ?? ''} ${participant.lastName ?? ''}`
                    .trim()
                    .replace(/\s+/g, ' ');
                  return (
                    <li
                      key={userId}
                      className='flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-4 py-3 last:border-b-0'
                    >
                      <div>
                        <p className='font-medium text-foreground'>
                          {fullName || 'Unnamed user'}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Current votes: {currentVotes}
                        </p>
                      </div>
                      <div className='flex flex-wrap items-center gap-4'>
                        <VoteAdjuster
                          label='Remove'
                          count={removeCount}
                          price={removePrice}
                          disableIncrement={remainingRemovals === 0}
                          onIncrement={() =>
                            adjustSelection(userId, 'remove', 1, currentVotes)
                          }
                          onDecrement={() => adjustSelection(userId, 'remove', -1)}
                        />
                        <VoteAdjuster
                          label='Add'
                          count={addCount}
                          price={addPrice}
                          onIncrement={() => adjustSelection(userId, 'add', 1)}
                          onDecrement={() => adjustSelection(userId, 'add', -1)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className='mt-6 space-y-3 rounded-xl border border-border bg-background/70 p-4'>
          <SummaryRow label={`Add votes (${totals.add})`} value={totals.addCost} />
          <SummaryRow label={`Remove votes (${totals.remove})`} value={totals.removeCost} />
          <div className='flex items-center justify-between border-t border-border pt-3 text-lg font-semibold text-foreground'>
            <span>Total price</span>
            <span>${totals.totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className='mt-4 flex flex-col gap-2'>
          {statusMessage && (
            <p className='text-xs text-emerald-500'>{statusMessage}</p>
          )}
          {errorMessage && (
            <p className='text-xs text-destructive'>{errorMessage}</p>
          )}
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-xs text-muted-foreground'>
              Submit purchases to update vote totals immediately.
            </p>
            <button
              type='button'
              disabled={!hasCart || submitting}
              onClick={handleCheckout}
              className='inline-flex items-center justify-center rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {submitting ? 'Submitting…' : 'Submit purchase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type SummaryRowProps = {
  label: string;
  value: number;
};

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className='flex items-center justify-between text-sm'>
      <span className='text-muted-foreground'>{label}</span>
      <span className='font-medium text-foreground'>${value.toFixed(2)}</span>
    </div>
  );
}

type VoteAdjusterProps = {
  label: 'Add' | 'Remove';
  count: number;
  price: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disableIncrement?: boolean;
};

function VoteAdjuster({ label, count, price, onIncrement, onDecrement, disableIncrement = false }: VoteAdjusterProps) {
  return (
    <div className='flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground'>
      <span className='text-xs text-muted-foreground'>{label} vote</span>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={onDecrement}
          disabled={count === 0}
          className='h-8 w-8 rounded-full border border-border text-lg font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'
        >
          &minus;
        </button>
        <span className='min-w-[1rem] text-center text-base font-semibold'>{count}</span>
        <button
          type='button'
          onClick={onIncrement}
          disabled={disableIncrement}
          className='h-8 w-8 rounded-full border border-border text-lg font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'
        >
          +
        </button>
      </div>
      <span className='text-xs text-muted-foreground'>${price.toFixed(2)} each</span>
    </div>
  );
}
