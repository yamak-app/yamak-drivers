import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../../contants/Colors";
import React from "react";
import AppText from "../ui/AppText";

const ButtonsProfile = ({
  title,
  icon = "home",
  onPress,
}: {
  title: string;
  icons: string;
  onPress: () => void;
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 60,
          width: "100%",
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 10,
          backgroundColor: AppColors.white,
          borderRadius: 20,
          paddingHorizontal: 20,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        style={{ marginRight: 15 }}
        name={icon}
        size={30}
        color="black"
      />
      <AppText >
        {title}
      </AppText>
    </Pressable>
  );
};

export default ButtonsProfile;

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
});
