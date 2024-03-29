import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useRef } from 'react'
import Modal from "react-native-modal";

import { useTranslation } from 'react-i18next'
import { AppSizes } from '../../contants/Sizes'
import { AppColorsTheme2 } from '../../contants/Colors'
import { AppFonts } from '../../contants/Fonts'


interface props {
    message?: string,
    title?: string,
    visible?: boolean,
    onCancel?: () => void
    onConfirm?: () => void,
    cancelMessage?: string
    confirmMessage?: string,
    setVisble?: (el: boolean) => void,
}
const AppAlert = ({
    message = "",
    title = "",
    visible,
    setVisble,
    onCancel,
    onConfirm,
    cancelMessage,
    confirmMessage

}: props) => {

    const { t } = useTranslation()


    return (
        <Modal
            style={{ flex: 1, }}
            isVisible={visible}
            backdropColor='white'
        >
            <Pressable style={styles.outerContainer}>
                <View style={styles.innerContainer}>
                    <View style={{ flex: 0.3, backgroundColor: AppColorsTheme2.primary }}>
                        <View style={{ width: 100, height: 100, borderWidth: 6, borderColor: "white", position: "absolute", alignSelf: "center", top: -50, backgroundColor: AppColorsTheme2.primary, borderRadius: 50, justifyContent: "center", alignItems: "center" }}>
                            <Image style={{ width: 70, height: 70 }} source={require("../../contants/images/exclamation.png")} />
                        </View>
                    </View>
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <Text style={styles.titleText}>{title}</Text>
                        <Text style={styles.messageText}>{message}</Text>
                    </View>

                    <View style={{ flexDirection: "column", marginBottom: 20 }}>
                        <Pressable style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]} onPress={onConfirm}>
                            <Text style={styles.confirmButtonText}>{confirmMessage ? confirmMessage : t("Confirm")}</Text>
                        </Pressable>
                        {onCancel && (<Pressable style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>{cancelMessage ? cancelMessage : t("Cancel")}</Text>
                        </Pressable>)}

                    </View>

                </View>
            </Pressable>
        </Modal >
    )
}

export default AppAlert

const styles = StyleSheet.create({
    outerContainer: {
        justifyContent: "center",
        alignItems: "center",
        flex: 1,

    },
    innerContainer: {
        width: '80%',
        height: 300,
        margin: 48,
        elevation: 24,
        shadowColor: '#171717',
        shadowOffset: { width: -2, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        borderRadius: 20,
        backgroundColor: "white",


    },

    titleText: {
        fontFamily: AppFonts.Roboto_Med,
        fontSize: AppSizes.large,
        textTransform: "capitalize",
        marginBottom: 10
        , maxWidth: 220

    },
    messageText: {
        fontFamily: AppFonts.Roboto_Med,
        fontSize: AppSizes.medium
        , maxWidth: 240,
        color: AppColorsTheme2.gray,
        textAlign: "center"
    },
    confirmButton: {
        justifyContent: "center",
        alignItems: "center",
        height: 40,
        backgroundColor: AppColorsTheme2.secondary,
        width: "60%",
        alignSelf: "center",
        borderRadius: 20
    },
    cancelButton: {
        justifyContent: "center",
        alignItems: "center",
        height: 40,
        color: AppColorsTheme2.secondary
    },
    confirmButtonText: {
        fontFamily: AppFonts.Roboto_Med,
        fontSize: AppSizes.medium
        , color: "white"
        , textTransform: "capitalize"
    },
    cancelButtonText: {
        fontFamily: AppFonts.Roboto_Med,
        fontSize: AppSizes.medium,
        color: AppColorsTheme2.secondary,
        textTransform: "capitalize"
    },
    pressed: {
        opacity: 0.7
    }
})