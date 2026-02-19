export const getAvatarColor = (name: string) => {
  const avatarGradients = [
    "from-red-500 to-red-600",
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-indigo-500 to-indigo-600",
    "from-yellow-500 to-yellow-600",
    "from-teal-500 to-teal-600",
  ];

  const hash = name
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return avatarGradients[hash % avatarGradients.length];
};
export const getInitials = (name: string) => {
  if (!name) return "";

  const words = name.trim().split(" ");

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
};
