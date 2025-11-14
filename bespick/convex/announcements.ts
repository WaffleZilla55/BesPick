import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    publishAt: v.number(), // epoch ms (client decides now vs scheduled)
    autoDeleteAt: v.optional(v.union(v.number(), v.null())),
    autoArchiveAt: v.optional(v.union(v.number(), v.null())),
    pollQuestion: v.optional(v.string()),
    pollOptions: v.optional(v.array(v.string())),
    pollAnonymous: v.optional(v.boolean()),
    pollAllowAdditionalOptions: v.optional(v.boolean()),
    pollMaxSelections: v.optional(v.number()),
    pollClosesAt: v.optional(v.union(v.number(), v.null())),
    eventType: v.optional(
      v.union(
        v.literal('announcements'),
        v.literal('poll'),
        v.literal('voting')
      )
    ),
    imageIds: v.optional(v.array(v.id('_storage'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const now = Date.now();

    const cleanedTitle = args.title.trim();
    const cleanedDescription = args.description.trim();

    if (!cleanedTitle) throw new Error('Title is required');

    const eventType =
      args.eventType === 'poll' || args.eventType === 'voting'
        ? args.eventType
        : 'announcements';

    if (!cleanedDescription && eventType !== 'poll') {
      throw new Error('Description is required');
    }

    const status = args.publishAt <= now ? 'published' : 'scheduled';
    const normalizedAutoDeleteAt =
      typeof args.autoDeleteAt === 'number' ? args.autoDeleteAt : null;
    const normalizedAutoArchiveAt =
      typeof args.autoArchiveAt === 'number' ? args.autoArchiveAt : null;

    if (
      normalizedAutoDeleteAt !== null &&
      normalizedAutoDeleteAt <= args.publishAt
    ) {
      throw new Error('Auto delete time must be after publish time.');
    }

    if (
      normalizedAutoArchiveAt !== null &&
      normalizedAutoArchiveAt <= args.publishAt
    ) {
      throw new Error('Auto archive time must be after publish time.');
    }

    if (
      normalizedAutoDeleteAt !== null &&
      normalizedAutoArchiveAt !== null
    ) {
      throw new Error('Choose either auto delete or auto archive, not both.');
    }

    let pollQuestion: string | null = null;
    let pollOptions: string[] | null = null;
    let pollAnonymous = false;
    let pollAllowAdditionalOptions = false;
    let pollMaxSelections = 1;
    let pollClosesAt: number | null = null;
    if (eventType === 'poll') {
      const questionInput = (args.pollQuestion ?? '').trim();
      if (!questionInput) {
        throw new Error('Poll question is required.');
      }
      if (questionInput.length > 100) {
        throw new Error('Poll question must be 100 characters or fewer.');
      }
      const optionInput = (args.pollOptions ?? []).map((option) =>
        option.trim()
      );
      const filteredOptions = optionInput.filter((option) => option.length > 0);
      if (filteredOptions.length < 2) {
        throw new Error('Polls require at least two options.');
      }
      pollQuestion = questionInput;
      pollOptions = filteredOptions;
      pollAnonymous = Boolean(args.pollAnonymous);
      pollAllowAdditionalOptions = Boolean(
        args.pollAllowAdditionalOptions,
      );
      const rawMaxSelections =
        typeof args.pollMaxSelections === 'number'
          ? Math.max(1, Math.floor(args.pollMaxSelections))
          : 1;
      pollMaxSelections = Math.max(
        1,
        Math.min(rawMaxSelections, pollOptions.length),
      );
      pollClosesAt =
        typeof args.pollClosesAt === 'number' ? args.pollClosesAt : null;
      if (pollClosesAt !== null && pollClosesAt <= args.publishAt) {
        throw new Error('Poll close time must be after the publish time.');
      }
    }

    const providedImageIds =
      Array.isArray(args.imageIds) && args.imageIds.length > 0
        ? args.imageIds
        : [];
    if (providedImageIds.length > 5) {
      throw new Error('You can upload up to five images.');
    }
    const normalizedImageIds = Array.from(new Set(providedImageIds));

    const id = await ctx.db.insert('announcements', {
      title: cleanedTitle,
      description: cleanedDescription,
      eventType,
      createdAt: now,
      publishAt: args.publishAt,
      status,
      createdBy: identity?.name?.toString(),
      autoDeleteAt: normalizedAutoDeleteAt,
      autoArchiveAt: normalizedAutoArchiveAt,
      pollQuestion: pollQuestion ?? undefined,
      pollOptions: pollOptions ?? undefined,
      pollAnonymous: eventType === 'poll' ? pollAnonymous : undefined,
      pollAllowAdditionalOptions:
        eventType === 'poll' ? pollAllowAdditionalOptions : undefined,
      pollMaxSelections:
        eventType === 'poll' ? pollMaxSelections : undefined,
      pollClosesAt:
        eventType === 'poll' ? pollClosesAt ?? undefined : undefined,
      imageIds: normalizedImageIds.length ? normalizedImageIds : undefined,
    });

    return { id, status };
  },
});

export const get = query({
  args: {
    id: v.id('announcements'),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query('announcements')
      .filter((q) =>
        q.and(
          q.neq(q.field('status'), 'archived'),
          q.or(
            q.eq(q.field('status'), 'published'),
            q.lte(q.field('publishAt'), args.now),
          ),
        ),
      )
      .collect();
    const normalized = announcements.map((announcement) =>
      announcement.status === 'scheduled' &&
      announcement.publishAt <= args.now
        ? { ...announcement, status: 'published' as const }
        : announcement,
    );
    return normalized.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const announcements = await ctx.db
      .query('announcements')
      .filter((q) => q.eq(q.field('status'), 'archived'))
      .collect();
    return announcements.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listScheduled = query({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const scheduled = await ctx.db
      .query('announcements')
      .withIndex('by_publishAt', (q) => q.eq('status', 'scheduled'))
      .filter((q) => q.gt(q.field('publishAt'), args.now))
      .collect();
    return scheduled.sort((a, b) => a.publishAt - b.publishAt);
  },
});

export const update = mutation({
  args: {
    id: v.id('announcements'),
    title: v.string(),
    description: v.string(),
    publishAt: v.number(),
    autoDeleteAt: v.optional(v.union(v.number(), v.null())),
    autoArchiveAt: v.optional(v.union(v.number(), v.null())),
    pollQuestion: v.optional(v.string()),
    pollOptions: v.optional(v.array(v.string())),
    pollAnonymous: v.optional(v.boolean()),
    pollAllowAdditionalOptions: v.optional(v.boolean()),
    pollMaxSelections: v.optional(v.number()),
    pollClosesAt: v.optional(v.union(v.number(), v.null())),
    eventType: v.optional(
      v.union(
        v.literal('announcements'),
        v.literal('poll'),
        v.literal('voting'),
      ),
    ),
    imageIds: v.optional(v.array(v.id('_storage'))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error('Activity not found');

    const now = Date.now();
    const cleanedTitle = args.title.trim();
    const cleanedDescription = args.description.trim();
    if (!cleanedTitle) throw new Error('Title is required');
    const eventType =
      args.eventType === 'poll' || args.eventType === 'voting'
        ? args.eventType
        : existing.eventType;
    if (!cleanedDescription && eventType !== 'poll') {
      throw new Error('Description is required');
    }

    const status = args.publishAt <= now ? 'published' : 'scheduled';

    const requestedAutoDeleteAt =
      typeof args.autoDeleteAt === 'number'
        ? args.autoDeleteAt
        : args.autoDeleteAt === null
          ? null
          : existing.autoDeleteAt ?? null;
    const requestedAutoArchiveAt =
      typeof args.autoArchiveAt === 'number'
        ? args.autoArchiveAt
        : args.autoArchiveAt === null
          ? null
          : existing.autoArchiveAt ?? null;

    if (
      requestedAutoDeleteAt !== null &&
      requestedAutoDeleteAt <= args.publishAt
    ) {
      throw new Error('Auto delete time must be after publish time.');
    }

    if (
      requestedAutoArchiveAt !== null &&
      requestedAutoArchiveAt <= args.publishAt
    ) {
      throw new Error('Auto archive time must be after publish time.');
    }

    if (
      requestedAutoDeleteAt !== null &&
      requestedAutoArchiveAt !== null
    ) {
      throw new Error('Choose either auto delete or auto archive, not both.');
    }

    let pollQuestion: string | null = null;
    let pollOptions: string[] | null = null;
    const pollAnonymous =
      typeof args.pollAnonymous === 'boolean'
        ? args.pollAnonymous
        : existing.pollAnonymous ?? false;
    const pollAllowAdditionalOptions =
      typeof args.pollAllowAdditionalOptions === 'boolean'
        ? args.pollAllowAdditionalOptions
        : existing.pollAllowAdditionalOptions ?? false;
    let pollMaxSelections =
      typeof args.pollMaxSelections === 'number'
        ? Math.max(1, Math.floor(args.pollMaxSelections))
        : existing.pollMaxSelections ?? 1;
    const pollClosesAt =
      typeof args.pollClosesAt === 'number'
        ? args.pollClosesAt
        : args.pollClosesAt === null
          ? null
          : existing.pollClosesAt ?? null;
    if (eventType === 'poll') {
      const questionInput =
        typeof args.pollQuestion === 'string'
          ? args.pollQuestion.trim()
          : existing.pollQuestion?.trim() ?? '';
      if (!questionInput) {
        throw new Error('Poll question is required.');
      }
      if (questionInput.length > 100) {
        throw new Error('Poll question must be 100 characters or fewer.');
      }
      const incomingOptions =
        args.pollOptions ??
        (Array.isArray(existing.pollOptions) ? existing.pollOptions : []);
      const cleanedOptions = incomingOptions.map((option) => option.trim());
      const filteredOptions = cleanedOptions.filter((option) => option.length > 0);
      if (filteredOptions.length < 2) {
        throw new Error('Polls require at least two options.');
      }
      pollQuestion = questionInput;
      pollOptions = filteredOptions;
      pollMaxSelections = Math.max(
        1,
        Math.min(pollMaxSelections, filteredOptions.length),
      );
      if (pollClosesAt !== null && pollClosesAt <= args.publishAt) {
        throw new Error('Poll close time must be after the publish time.');
      }
    }

    const providedImageIds =
      Array.isArray(args.imageIds) && args.imageIds.length > 0
        ? args.imageIds
        : existing.imageIds ?? [];
    if (providedImageIds.length > 5) {
      throw new Error('You can upload up to five images.');
    }
    const normalizedImageIds = Array.from(new Set(providedImageIds));

    const updatedBy =
      identity?.name ??
      identity?.tokenIdentifier ??
      identity?.subject ??
      'anonymous';

    await ctx.db.patch(args.id, {
      title: cleanedTitle,
      description: cleanedDescription,
      publishAt: args.publishAt,
      status,
      eventType,
      updatedAt: now,
      updatedBy,
      autoDeleteAt: requestedAutoDeleteAt,
      autoArchiveAt: requestedAutoArchiveAt,
      pollQuestion:
        eventType === 'poll'
          ? pollQuestion ?? existing.pollQuestion ?? undefined
          : undefined,
      pollOptions:
        eventType === 'poll'
          ? pollOptions ?? existing.pollOptions ?? undefined
          : undefined,
      pollAnonymous:
        eventType === 'poll'
          ? pollAnonymous
          : undefined,
      pollAllowAdditionalOptions:
        eventType === 'poll'
          ? pollAllowAdditionalOptions
          : undefined,
      pollMaxSelections:
        eventType === 'poll'
          ? pollMaxSelections
          : undefined,
      pollClosesAt:
        eventType === 'poll'
          ? pollClosesAt ?? undefined
          : undefined,
      imageIds:
        normalizedImageIds.length > 0 ? normalizedImageIds : undefined,
    });

    return { id: args.id, status };
  },
});

export const publishDue = mutation({
  args: {
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const dueAnnouncements = await ctx.db
      .query('announcements')
      .withIndex('by_publishAt', (q) => q.eq('status', 'scheduled'))
      .filter((q) => q.lte(q.field('publishAt'), args.now))
      .collect();

    await Promise.all(
      dueAnnouncements.map((announcement) =>
        ctx.db.patch(announcement._id, { status: 'published' }),
      ),
    );

    const candidates = await ctx.db.query('announcements').collect();
    const deleteDue = candidates.filter(
      (announcement) =>
        typeof announcement.autoDeleteAt === 'number' &&
        announcement.autoDeleteAt <= args.now,
    );

    await Promise.all(
      deleteDue.map((announcement) => ctx.db.delete(announcement._id)),
    );

    const archiveDue = candidates.filter(
      (announcement) =>
        announcement.status !== 'archived' &&
        typeof announcement.autoArchiveAt === 'number' &&
        announcement.autoArchiveAt <= args.now,
    );

    await Promise.all(
      archiveDue.map((announcement) =>
        ctx.db.patch(announcement._id, { status: 'archived' }),
      ),
    );

    return {
      updated: dueAnnouncements.length,
      deleted: deleteDue.length,
      archived: archiveDue.length,
    };
  },
});

export const getPoll = query({
  args: {
    id: v.id('announcements'),
  },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.id);
    if (!announcement || announcement.eventType !== 'poll') {
      throw new Error('Poll not found.');
    }

    const identity = await ctx.auth.getUserIdentity();
    const votes = await ctx.db
      .query('pollVotes')
      .withIndex('by_announcement', (q) => q.eq('announcementId', args.id))
      .collect();

    const counts = new Map<string, number>();
    for (const vote of votes) {
      for (const selection of vote.selections) {
        counts.set(selection, (counts.get(selection) ?? 0) + 1);
      }
    }

    const options = (announcement.pollOptions ?? []).map((option) => ({
      value: option,
      votes: counts.get(option) ?? 0,
    }));

    const totalVotes = votes.reduce(
      (sum, vote) => sum + vote.selections.length,
      0,
    );

    const currentUserId = identity?.subject;
    const currentUserSelections = currentUserId
      ? votes.find((vote) => vote.userId === currentUserId)?.selections ?? []
      : [];

    const closesAt = announcement.pollClosesAt ?? null;
    const isClosed =
      typeof closesAt === 'number' ? closesAt <= Date.now() : false;

    return {
      _id: announcement._id,
      question: announcement.pollQuestion ?? announcement.title,
      description: announcement.description,
      options,
      totalVotes,
      pollAnonymous: announcement.pollAnonymous ?? false,
      pollAllowAdditionalOptions:
        announcement.pollAllowAdditionalOptions ?? false,
      pollMaxSelections: announcement.pollMaxSelections ?? 1,
      currentUserSelections,
      closesAt,
      isClosed,
      isArchived: announcement.status === 'archived',
      imageIds: announcement.imageIds ?? [],
    };
  },
});

export const getPollVoteBreakdown = query({
  args: {
    id: v.id('announcements'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const announcement = await ctx.db.get(args.id);
    if (!announcement || announcement.eventType !== 'poll') {
      throw new Error('Poll not found.');
    }

    const votes = await ctx.db
      .query('pollVotes')
      .withIndex('by_announcement', (q) => q.eq('announcementId', args.id))
      .collect();

    const optionMap = new Map<
      string,
      {
        value: string;
        voters: { userId: string; userName: string | null }[];
      }
    >();

    for (const option of announcement.pollOptions ?? []) {
      optionMap.set(option, { value: option, voters: [] });
    }

    for (const vote of votes) {
      for (const selection of vote.selections) {
        if (!optionMap.has(selection)) {
          optionMap.set(selection, { value: selection, voters: [] });
        }
        optionMap.get(selection)!.voters.push({
          userId: vote.userId,
          userName: vote.userName ?? null,
        });
      }
    }

    const options = Array.from(optionMap.values()).map((option) => ({
      value: option.value,
      voters: option.voters,
      voteCount: option.voters.length,
    }));

    const totalVotes = votes.reduce(
      (sum, vote) => sum + vote.selections.length,
      0,
    );

    return {
      pollId: announcement._id,
      options,
      totalVotes,
    };
  },
});

export const votePoll = mutation({
  args: {
    id: v.id('announcements'),
    selections: v.array(v.string()),
    newOption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const announcement = await ctx.db.get(args.id);
    if (!announcement || announcement.eventType !== 'poll') {
      throw new Error('Poll not found.');
    }

    const now = Date.now();
    const options = [...(announcement.pollOptions ?? [])];

    if (
      typeof announcement.pollClosesAt === 'number' &&
      announcement.pollClosesAt <= now
    ) {
      throw new Error('This poll has closed.');
    }
    if (announcement.status === 'archived') {
      throw new Error('This poll is archived and read-only.');
    }

    let newOptionValue: string | null = null;
    if (args.newOption && args.newOption.trim().length > 0) {
      if (!announcement.pollAllowAdditionalOptions) {
        throw new Error('Adding options is not allowed for this poll.');
      }
      const trimmed = args.newOption.trim();
      const exists = options.find(
        (option) => option.toLowerCase() === trimmed.toLowerCase(),
      );
      if (!exists) {
        options.push(trimmed);
        newOptionValue = trimmed;
        await ctx.db.patch(args.id, { pollOptions: options });
      } else {
        newOptionValue = exists;
      }
    }

    let selections = args.selections
      .map((selection) => selection.trim())
      .filter((selection) => selection.length > 0);
    if (newOptionValue && !selections.includes(newOptionValue)) {
      selections.push(newOptionValue);
    }
    selections = Array.from(new Set(selections));
    if (selections.length === 0) {
      throw new Error('Select at least one option.');
    }

    const maxSelections = Math.max(1, announcement.pollMaxSelections ?? 1);
    if (selections.length > maxSelections) {
      throw new Error(
        `You can select up to ${maxSelections} option${
          maxSelections > 1 ? 's' : ''
        }.`,
      );
    }

    const normalizedSelections = selections.map((selection) => {
      if (!options.includes(selection)) {
        throw new Error('Selected option is not available.');
      }
      return selection;
    });

    const existingVote = await ctx.db
      .query('pollVotes')
      .withIndex('by_announcement_user', (q) =>
        q.eq('announcementId', args.id).eq('userId', identity.subject),
      )
      .unique();
    const displayName =
      identity.name ??
      identity.email ??
      identity.tokenIdentifier ??
      identity.subject;

    if (existingVote) {
      await ctx.db.patch(existingVote._id, {
        selections: normalizedSelections,
        updatedAt: now,
        userName: displayName,
      });
    } else {
      await ctx.db.insert('pollVotes', {
        announcementId: args.id,
        userId: identity.subject,
        userName: displayName,
        selections: normalizedSelections,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const nextPublishAt = query({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const upcoming = await ctx.db
      .query('announcements')
      .withIndex('by_publishAt', (q) => q.eq('status', 'scheduled'))
      .filter((q) => q.gt(q.field('publishAt'), args.now))
      .first();
    return upcoming?.publishAt ?? null;
  },
});

export const remove = mutation({
  args: {
    id: v.id('announcements'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error('Activity not found');
    }
    if (existing.eventType === 'poll') {
      const votes = await ctx.db
        .query('pollVotes')
        .withIndex('by_announcement', (q) => q.eq('announcementId', args.id))
        .collect();
      await Promise.all(votes.map((vote) => ctx.db.delete(vote._id)));
    }
    await ctx.db.delete(args.id);
  },
});

export const archive = mutation({
  args: {
    id: v.id('announcements'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }
    await ctx.db.patch(args.id, { status: 'archived' });
  },
});
