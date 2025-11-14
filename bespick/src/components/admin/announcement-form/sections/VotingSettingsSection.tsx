'use client';

import * as React from 'react';

import { GROUP_OPTIONS, type Group, type Portfolio } from '@/lib/org';

type LeaderboardOption = {
  value: string;
  label: string;
  description: string;
};

type VotingSettingsSectionProps = {
  isVoting: boolean;
  addVotePrice: string;
  removeVotePrice: string;
  onChangeAddPrice: (value: string) => void;
  onChangeRemovePrice: (value: string) => void;
  groupSelections: Record<Group, boolean>;
  portfolioSelections: Record<Portfolio, boolean>;
  allowUngrouped: boolean;
  leaderboardMode: string;
  leaderboardOptions: LeaderboardOption[];
  onToggleGroup: (group: Group, checked: boolean) => void;
  onTogglePortfolio: (portfolio: Portfolio, checked: boolean) => void;
  onToggleUngrouped: (checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onChangeLeaderboardMode: (value: string) => void;
  allSelected: boolean;
  loading: boolean;
  error: string | null;
};

export function VotingSettingsSection({
  isVoting,
  addVotePrice,
  removeVotePrice,
  onChangeAddPrice,
  onChangeRemovePrice,
  groupSelections,
  portfolioSelections,
  allowUngrouped,
  leaderboardMode,
  leaderboardOptions,
  onToggleGroup,
  onTogglePortfolio,
  onToggleUngrouped,
  onToggleSelectAll,
  onChangeLeaderboardMode,
  allSelected,
  loading,
  error,
}: VotingSettingsSectionProps) {
  if (!isVoting) return null;

  return (
    <section className='space-y-4 rounded-2xl border border-border bg-card/40 p-4'>
      <div className='flex flex-col gap-1'>
        <h3 className='text-base font-semibold text-foreground'>
          Voting settings
        </h3>
        <p className='text-sm text-muted-foreground'>
          Set the prices teammates will pay to add or remove votes and choose
          which groups can participate.
        </p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <label className='flex flex-col gap-2 text-sm text-foreground'>
          Price to add a vote
          <input
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            value={addVotePrice}
            onChange={(event) => onChangeAddPrice(event.target.value)}
            placeholder='e.g. 5'
            className='rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          />
        </label>
        <label className='flex flex-col gap-2 text-sm text-foreground'>
          Price to remove a vote
          <input
            type='number'
            min='0'
            step='0.01'
            inputMode='decimal'
            value={removeVotePrice}
            onChange={(event) => onChangeRemovePrice(event.target.value)}
            placeholder='e.g. 10'
            className='rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          />
          </label>
      </div>

      <div className='space-y-2 rounded-xl border border-border bg-background/60 p-4'>
        <p className='text-sm font-semibold text-foreground'>Leaderboard mode</p>
        <div className='grid gap-2 sm:grid-cols-3'>
          {leaderboardOptions.map((option) => {
            const checked = leaderboardMode === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-3 py-2 text-xs transition ${checked ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:border-primary/60'}`}
              >
                <span className='flex items-center gap-2 text-sm font-semibold'>
                  <input
                    type='radio'
                    name='leaderboardMode'
                    value={option.value}
                    checked={checked}
                    onChange={(event) => onChangeLeaderboardMode(event.target.value)}
                    className='h-4 w-4 border-border accent-primary'
                  />
                  {option.label}
                </span>
                <span className='text-[11px] text-muted-foreground'>{option.description}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className='space-y-4 rounded-xl border border-border bg-background/60 p-4'>
        <label className='flex items-center gap-2 text-sm font-medium text-foreground'>
          <input
            type='checkbox'
            checked={allSelected}
            onChange={(event) => onToggleSelectAll(event.target.checked)}
            className='h-4 w-4 rounded border-border accent-primary'
          />
          <span>Select everyone</span>
        </label>

        <div className='grid gap-4 sm:grid-cols-2'>
          {GROUP_OPTIONS.map((group) => {
            const checked = groupSelections[group.value];
            return (
              <div
                key={group.value}
                className={`rounded-2xl border border-border/60 p-3 transition ${checked ? 'bg-primary/5 shadow-sm' : 'bg-card/60'}`}
              >
                <label className='flex items-center gap-2 text-sm font-semibold text-foreground'>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={(event) => onToggleGroup(group.value, event.target.checked)}
                    className='h-4 w-4 rounded border-border accent-primary'
                  />
                  {group.label}
                </label>
                {group.portfolios.length > 0 && (
                  <details
                    className={`mt-3 rounded-xl border border-border/40 bg-background/70 transition ${checked ? 'open:bg-background' : ''}`}
                    open={checked}
                  >
                    <summary className='flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                      Portfolios
                      <span>{checked ? '−' : '+'}</span>
                    </summary>
                    <div className='border-t border-border/40 px-3 py-3'>
                      <div className='flex flex-wrap gap-2'>
                        {group.portfolios.map((portfolio) => (
                          <label
                            key={portfolio}
                            className='flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs text-foreground'
                          >
                            <input
                              type='checkbox'
                              checked={portfolioSelections[portfolio]}
                              onChange={(event) =>
                                onTogglePortfolio(portfolio, event.target.checked)
                              }
                              className='h-4 w-4 rounded border-border accent-primary'
                            />
                            {portfolio}
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        <label className='flex items-center gap-2 text-sm text-foreground'>
          <input
            type='checkbox'
            checked={allowUngrouped}
            onChange={(event) => onToggleUngrouped(event.target.checked)}
            className='h-4 w-4 rounded border-border accent-primary'
          />
          Include teammates without a group assignment
        </label>

        {loading && (
          <p className='text-xs text-muted-foreground'>Loading roster…</p>
        )}
      </div>

      {error && (
        <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600'>
          {error}
        </div>
      )}
    </section>
  );
}
