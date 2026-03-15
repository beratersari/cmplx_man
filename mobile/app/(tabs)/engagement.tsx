import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from '../../locales';
import { EngagementHeader, EngagementSessionBanner } from '../../components/molecules';
import { EngagementBlockCard } from '../../components/organisms';
import {
  useCastEngagementVoteMutation,
  useEndEngagementSessionMutation,
  useGetEngagementBlocksQuery,
  useStartEngagementSessionMutation,
} from '../../store/apiSlice';

const EngagementScreen = () => {
  const { t } = useTranslation();
  const { data: blocks = [], isFetching } = useGetEngagementBlocksQuery();
  const [startSession] = useStartEngagementSessionMutation();
  const [endSession] = useEndEngagementSessionMutation();
  const [castVote] = useCastEngagementVoteMutation();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string[]>>({});
  const sessionIdRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const openSession = async () => {
        try {
          const result = await startSession().unwrap();
          if (!active) return;
          setSessionId(result.session_id);
          sessionIdRef.current = result.session_id;
          setSessionExpiresAt(result.expires_at);
          setSelectedVotes({});
        } catch (error) {
          console.error('Failed to start engagement session', error);
        }
      };
      openSession();

      return () => {
        active = false;
        if (sessionIdRef.current) {
          endSession({ sessionId: sessionIdRef.current });
          sessionIdRef.current = null;
        }
      };
    }, [endSession, startSession])
  );

  const isSessionActive = useMemo(() => {
    if (!sessionExpiresAt) return false;
    const expiresAt = new Date(sessionExpiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return true;
    }
    return expiresAt.getTime() > Date.now();
  }, [sessionExpiresAt]);

  const handleVote = useCallback(async (blockId: string, optionId: string) => {
    if (!sessionId || !isSessionActive) return;
    setSelectedVotes((prev) => {
      const existing = prev[blockId] || [];
      if (existing.includes(optionId)) {
        return prev;
      }
      return { ...prev, [blockId]: [...existing, optionId] };
    });
    try {
      await castVote({ sessionId, blockId, optionId }).unwrap();
    } catch (error) {
      setSelectedVotes((prev) => {
        const existing = prev[blockId] || [];
        return { ...prev, [blockId]: existing.filter((item) => item !== optionId) };
      });
      console.error('Failed to cast vote', error);
    }
  }, [castVote, isSessionActive, sessionId]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <EngagementHeader title={t('engagement.title')} subtitle={t('engagement.subtitle')} />

        {!isSessionActive && sessionId && (
          <EngagementSessionBanner message={t('engagement.sessionExpired')} />
        )}

        {isFetching && blocks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        ) : (
          blocks.map((block: any) => (
            <EngagementBlockCard
              key={block.id}
              block={block}
              sessionId={sessionId}
              isSessionActive={isSessionActive}
              onVote={handleVote}
              selectedOptions={selectedVotes[block.id] || []}
              t={t}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default EngagementScreen;
