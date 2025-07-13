import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Link } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Ionicons } from '@expo/vector-icons';

interface Club {
  _id: string;
  name: string;
  username: string;
  description: string;
  category: string;
  logoUrl?: string;
  isPrivate: boolean;
  tags: string[];
  stats: {
    memberCount: number;
    lastActivity: string;
  };
  owner: {
    name: string;
    avatar?: string;
  };
  isMember?: boolean;
}

interface ClubCardProps {
  club: Club;
}

export function ClubCard({ club }: ClubCardProps) {
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      gaming: 'game-controller-outline',
      sports: 'basketball-outline',
      technology: 'laptop-outline',
      music: 'musical-notes-outline',
      art: 'brush-outline',
      education: 'school-outline',
      business: 'briefcase-outline',
      social: 'people-outline',
      other: 'ellipsis-horizontal-outline',
    };
    return icons[category] || 'ellipsis-horizontal-outline';
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Link href={`/clubs/${club.username}`} asChild>
      <TouchableOpacity>
        <Card className="mb-3 p-4">
          <View className="flex-row items-start space-x-3">
            {/* Club Logo */}
            <View className="relative">
              <Image
                source={{ uri: club.logoUrl || 'https://via.placeholder.com/60' }}
                className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700"
              />
              {club.isMember && (
                <View className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
              )}
            </View>

            {/* Club Info */}
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center mb-1">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white flex-1" numberOfLines={1}>
                  {club.name}
                </Text>
                <View className="flex-row items-center ml-2">
                  <Ionicons
                    name={getCategoryIcon(club.category)}
                    size={16}
                    color="#6b7280"
                  />
                  {club.isPrivate && (
                    <Ionicons
                      name="lock-closed-outline"
                      size={14}
                      color="#6b7280"
                      className="ml-1"
                    />
                  )}
                </View>
              </View>

              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2" numberOfLines={2}>
                {club.description}
              </Text>

              {/* Tags */}
              {club.tags.length > 0 && (
                <View className="flex-row flex-wrap mb-2">
                  {club.tags.slice(0, 3).map((tag, index) => (
                    <View
                      key={index}
                      className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-1 mb-1"
                    >
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        #{tag}
                      </Text>
                    </View>
                  ))}
                  {club.tags.length > 3 && (
                    <View className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-1 mb-1">
                      <Text className="text-xs text-gray-600 dark:text-gray-400">
                        +{club.tags.length - 3}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Stats */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="people-outline" size={14} color="#6b7280" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                    {formatMemberCount(club.stats.memberCount)}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={14} color="#6b7280" />
                  <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                    {club.owner.name}
                  </Text>
                </View>
              </View>
            </View>

            {/* Arrow */}
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </View>
        </Card>
      </TouchableOpacity>
    </Link>
  );
}