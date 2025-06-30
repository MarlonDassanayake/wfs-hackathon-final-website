import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, {
  Extrapolate,
  FadeIn,
  FadeInDown,
  interpolate,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';

const { width } = Dimensions.get('window');
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CATEGORIES = [
  { icon: 'doc.text' as const, label: 'Grammar' },
  { icon: 'house.fill' as const, label: 'Speaking' },
  { icon: 'paperplane.fill' as const, label: 'Listening' },
  { icon: 'gearshape.fill' as const, label: 'Vocabulary' },
];

const CategoryCard: React.FC<{
  category: typeof CATEGORIES[number];
  index: number;
  backgroundColor: string;
  iconColor: string;
  tintColor: string;
}> = ({ category, index, backgroundColor, iconColor, tintColor }) => {
  const scale = useSharedValue(1);
  
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, []);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <AnimatedThemedView
        entering={FadeIn.delay(400 + index * 100)}
        style={[
          styles.categoryCard,
          { backgroundColor, borderColor: iconColor },
          cardAnimatedStyle
        ]}
      >
        <IconSymbol
          size={32}
          color={tintColor}
          name={category.icon}
          style={styles.categoryIcon}
        />
        <ThemedText style={styles.categoryLabel}>{category.label}</ThemedText>
      </AnimatedThemedView>
    </AnimatedPressable>
  );
};

const ExploreScreen: React.FC = () => {
  // Initialize state with explicit types and default values
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  const tabIconColor = useThemeColor({}, 'tabIconDefault');

  // Animation values
  const searchBoxScale = useSharedValue(1);
  const searchIconRotation = useSharedValue(0);
  const loadingProgress = useSharedValue(0);

  const handleSearchFocus = useCallback(() => {
    searchBoxScale.value = withSpring(1.02);
    searchIconRotation.value = withSequence(
      withTiming(45, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );
  }, []);

  const handleSearchBlur = useCallback(() => {
    searchBoxScale.value = withSpring(1);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setError(null);
    setIsSearching(true);
    
    if (text.length <= 100) {
      setSearchQuery(text);
      // Simulate search loading animation
      loadingProgress.value = withSequence(
        withTiming(1, { duration: 1000 }),
        withDelay(500, withTiming(0))
      );
      setTimeout(() => setIsSearching(false), 1500);
    } else {
      setError('Search query is too long');
    }
  }, []);

  const searchBoxAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchBoxScale.value }],
  }));

  const searchIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${searchIconRotation.value}deg` }],
  }));

  const loadingBarStyle = useAnimatedStyle(() => ({
    width: interpolate(
      loadingProgress.value,
      [0, 1],
      [0, width - 40],
      Extrapolate.CLAMP
    ),
    height: 2,
    backgroundColor: tintColor,
    borderRadius: 2,
  }));

  const renderCategories = useMemo(() => (
    <AnimatedThemedView 
      entering={FadeInDown.delay(300).springify()} 
      style={styles.categoriesContainer}
    >
      <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
      <ThemedView style={styles.categoriesGrid}>
        {CATEGORIES.map((category, index) => (
          <CategoryCard
            key={category.label}
            category={category}
            index={index}
            backgroundColor={backgroundColor}
            iconColor={iconColor}
            tintColor={tintColor}
          />
        ))}
      </ThemedView>
    </AnimatedThemedView>
  ), [backgroundColor, iconColor, tintColor]);

  const renderContent = useMemo(() => {
    if (searchQuery) {
      return (
        <AnimatedThemedView 
          entering={FadeInDown.springify()}
          layout={Layout.springify()}
          style={[styles.resultCard, { backgroundColor, borderColor: iconColor }]}
        >
          <Animated.View style={loadingBarStyle} />
          <IconSymbol
            size={40}
            color={tintColor}
            name="doc.text.magnifyingglass"
            style={[styles.resultIcon, isSearching && styles.pulseAnimation]}
          />
          <ThemedText style={styles.resultText}>
            {isSearching ? 'Searching...' : `Found results for: "${searchQuery}"`}
          </ThemedText>
          {!isSearching && (
            <ThemedText style={styles.resultSubtext}>
              Finding the best learning resources for you...
            </ThemedText>
          )}
        </AnimatedThemedView>
      );
    }

    return (
      <AnimatedThemedView 
        entering={FadeInDown.delay(200).springify()}
        style={styles.welcomeSection}
      >
        <IconSymbol
          size={60}
          color={tintColor}
          name="sparkles"
          style={styles.welcomeIcon}
        />
        <ThemedText style={styles.welcomeTitle}>
          Welcome to English Learning!
        </ThemedText>
        <ThemedText style={styles.welcomeText}>
          Explore our vast collection of lessons, exercises, and resources to improve your English skills.
        </ThemedText>
      </AnimatedThemedView>
    );
  }, [searchQuery, backgroundColor, iconColor, tintColor, isSearching]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F8F9FA', dark: '#1A1A1A' }}
      headerImage={
        <IconSymbol
          size={310}
          color={tintColor}
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <AnimatedThemedView 
        entering={FadeIn} 
        style={styles.container}
      >
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>Explore</ThemedText>
          <HelloWave />
        </ThemedView>
        
        <AnimatedThemedView 
          entering={FadeInDown.delay(100).springify()}
          style={styles.searchContainer}
        >
          <AnimatedThemedView 
            style={[
              styles.searchBox, 
              { borderColor: iconColor, backgroundColor },
              searchBoxAnimatedStyle
            ]}
          >
            <Animated.View style={searchIconAnimatedStyle}>
              <IconSymbol
                size={20}
                color={tabIconColor}
                name="magnifyingglass"
                style={styles.searchIcon}
              />
            </Animated.View>
            <TextInput
              placeholder="Search for lessons, topics, or exercises..."
              placeholderTextColor={tabIconColor}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              style={[styles.textInput, { color: textColor }]}
              maxLength={100}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </AnimatedThemedView>
          {error ? (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          ) : null}
        </AnimatedThemedView>

        {renderContent}
        {!searchQuery && renderCategories}
      </AnimatedThemedView>
    </ParallaxScrollView>
  );
};

export default ExploreScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerImage: {
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 16,
  },
  resultCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  resultIcon: {
    marginBottom: 16,
    marginTop: 12,
  },
  pulseAnimation: {
    opacity: 0.7,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  welcomeIcon: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  categoriesContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryIcon: {
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
