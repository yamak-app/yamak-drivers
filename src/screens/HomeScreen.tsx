import { FlatList, Image, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { AppColors } from "../contants/Colors";
import LottieFile from "../components/ui/LottieFile";
import { t } from "i18next";
import useAppStore from "../store/userStore";
import { updateDriverStatus } from "../api/AuthApi";
import { ErrorHandlerApi, fixNumber, wait } from "../helpers/AppHelpers";
import FlashMessage, { showMessage } from "react-native-flash-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserDto } from "../dtos/UserDto";
import AppActiveButton from "../components/Home/AppActiveButton";
import { VehicleDto } from "../dtos/VehicleDto";
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AppSettingModal from "../components/Home/AppSettingModal";
import { updateVehicleLink, updateVehiclesLocation } from "../api/vehiclesApi";
import { CallDriverVehicle } from "../actions/commonActions";
import { AppContants, AsyncStorageConstants } from "../contants/AppConstants";
import AppHeader from "../components/ui/AppHeader";
import { getStorageValues } from "../helpers/AppAsyncStoreage";
import AppPermissionsModal from "../components/models/AppPermissionsModal";

// 10 meters (adjust as needed)
TaskManager.defineTask(AppContants.locationBgTask, async ({ data, error }) => {
    if (error) {
        console.error(error)
        return
    }
    if (data) {
        // @ts-ignore
        const { locations } = data
        const location = locations[0]
        if (location) {
            const latitude = location.coords.latitude
            const longitude = location.coords.longitude
            updateVehiclesLocation({ latitude: latitude, longitude: longitude }).then((res) => {
                console.log("update vehicle in background ===>", { res })
            }).catch(error => {
                console.log(error)
            })
        }
    }
})
const HomeScreen = () => {
    const [refreshing, setRefreshing] = useState(false);
    const [isDeniedPermissions, setIsDeniedPermissions] = useState(false)
    const [loctionPermission, setLoctionPermission] = useState({ bg: false, fg: false })
    const [storedValue, setstoredValue] = useState(false)

    const stateApp = useAppStore()
    const [userCurrentLocation, setUserCurrentLocation] = useState({ lat: 0, lng: 0 });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [driverStatus, setDriverStatus] = useState(stateApp.user.status);
    const [isLinked, setIsLinked] = useState(stateApp.vehicle.workStatus == 'online');

    useEffect(() => {
        setIsLinked(stateApp.vehicle.workStatus == 'online')
    }, [stateApp.vehicle])

    useEffect(() => {
        async function getStoredData() {
            const isSkipedValue = await getStorageValues(AsyncStorageConstants.isSkipedPermissions)
            if (!isSkipedValue) {
                setstoredValue(false)
                return
            }
            setstoredValue(true)
        }
        getStoredData()
        CallHomeApis()
    }, [])

    useEffect(() => {
        let interval;
        const fetchData = async () => {
            try {
                if (driverStatus !== "active" || !isLinked) return;
                console.log("permissions cond==>");

                const res = await getAppLocationsPermissions()
                if (!res) return;

                interval = setInterval(async () => {
                    try {
                        console.log("fetching location forground");
                        let location = await Location.getCurrentPositionAsync({});
                        const { latitude, longitude } = location?.coords || {};
                        setUserCurrentLocation({ lat: latitude, lng: longitude });
                        const updateRes = await updateVehiclesLocation({ latitude, longitude });
                        console.log("updateViecle in forgrounded", { updateRes });

                        if (driverStatus !== "active") {
                            clearInterval(interval)
                        }

                    } catch (error) {
                        console.log("error Location in forgorund ==>", JSON.stringify(error?.message));
                    }
                }, AppContants.locationTimeInterval);

            } catch (error) {
                console.error("An error occurred:", error);
            }
        }
        fetchData()
        return () => clearInterval(interval);
    }, [driverStatus, isLinked])


    async function CallHomeApis() {
        return CallDriverVehicle(stateApp)
    }
    const requestForegroundPermission = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
            setLoctionPermission(prev => ({ ...prev, fg: true }))
            setIsDeniedPermissions(true)
            console.log("Permission forground to access location was denied");
            return false
        }
        setLoctionPermission(prev => ({ ...prev, fg: false }))
        setIsDeniedPermissions(false)
        return true

    }
    const requestBackgroundLocationPermission = async () => {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        if (status !== "granted") {
            setLoctionPermission(prev => ({ ...prev, bg: true }))
            if (!storedValue)
                setIsDeniedPermissions(true)
            console.log("Permission background location was denied");
            return false
        }
        setLoctionPermission(prev => ({ ...prev, bg: false }))
        setIsDeniedPermissions(false)
        return true
    };
    const startBackgroundLocationUpdates = async () => {
        await Location.startLocationUpdatesAsync(AppContants.locationBgTask, {
            accuracy: Location.Accuracy.Highest,
            timeInterval: AppContants.locationTimeInterval,
            distanceInterval: AppContants.locationDistanceInterval,
            deferredUpdatesDistance: AppContants.locationDistanceInterval,
            deferredUpdatesInterval: AppContants.locationTimeInterval,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
                notificationTitle: 'Location Updates',
                notificationBody: 'We are tracking your location',
                notificationColor: '#3498db',
            },

        });

    };



    async function getAppLocationsPermissions() {
        try {
            const fgRes = await requestForegroundPermission()
            if (!fgRes) return false
            const bgRes = await requestBackgroundLocationPermission();
            if (bgRes)
                await startBackgroundLocationUpdates();
            return true
        } catch (error) {
            console.log("app location permissions errors ==>", error);
            return false
        }
    }

    const onRefresh = useCallback(async () => {

        setRefreshing(true);
        await CallHomeApis()
        wait(4000).then(() => setRefreshing(false));
    }, []);

    const updateWorkStatus = () => {
        console.log({ driverStatus });

        if (!isLinked && driverStatus == "inactive") {
            showMessage({
                message: "Error Message",
                description: "driver should be linked to vehicle first",
                type: "danger",
            });
            return
        }
        setIsLoading(true);
        const newStatus = driverStatus == "inactive" ? 'active' : 'inactive'
        updateDriverStatus(newStatus).then((response: any) => {
            const driver = response.data.data;
            const user = new UserDto(driver);
            setDriverStatus(user.status)
            AsyncStorage.setItem('user', JSON.stringify(user))
            stateApp.setUser(user)
            showMessage({
                message: "Success Message",
                description: "Update Successfully to " + user.status,
                type: "success",
            });
            setIsLoading(false);
        }).catch((error: any) => {
            setIsLoading(false);
            if (error?.response?.data) {
                const errorMessage = ErrorHandlerApi(error);
                showMessage({
                    message: "Error Message",
                    description: errorMessage,
                    type: "danger",
                });
            } else {
                showMessage({
                    message: "Error Message",
                    description: error.message,
                    type: "danger",
                });
            }
        })
    }
    async function updateLink() {
        setIsLoading(true);
        try {
            const response = await updateVehicleLink()
            const data = response.data.data;
            const vehicle = new VehicleDto(data);
            setIsLinked(vehicle.workStatus == 'online')
            stateApp.setVehicle(vehicle)
            showMessage({
                message: "Success Message",
                description: "Update Successfully to " + vehicle.workStatus,
                type: "success",
            });
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            if (error?.response?.data) {
                const errorMessage = ErrorHandlerApi(error);
                showMessage({
                    message: "Error Message",
                    description: errorMessage,
                    type: "danger",
                });
            } else {
                showMessage({
                    message: "Error Message",
                    description: error.message,
                    type: "danger",
                });
            }
        }

    }



    // @ts-ignore
    return (
        <ScrollView
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                />
            }

            contentContainerStyle={{ flexGrow: 1 }} style={{ flexGrow: 1 }}>

            <AppHeader />
            <View style={styles.container}>
                {isLoading && <LottieFile />}
                {/*user profile  */}
                <View style={{
                    flex: 1,
                    justifyContent: "flex-end",
                }}>
                    <View style={{ bottom: -50 }}>
                        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginLeft: 20, marginBottom: 40 }}>
                            <View style={{
                                borderWidth: 1,
                                borderColor: AppColors.primary,
                                width: 100, height: 100, borderRadius: 50,
                                justifyContent: "center", alignItems: "center"
                            }}>
                                <Image
                                    style={styles.img}
                                    source={{ uri: stateApp.user.photo }} />
                            </View>

                            <View style={{ marginLeft: 20, }}>
                                <Text style={{ fontSize: 20, color: "gray", marginBottom: 10, textTransform: "capitalize" }}>
                                    {stateApp.user.name}
                                </Text>
                                <Text style={{ fontSize: 20, color: "gray" }}>
                                    {stateApp.user.phoneNum}
                                </Text>

                            </View>

                        </View>
                        <View style={{ alignItems: "center", justifyContent: "space-around", flexDirection: "row" }}>
                            <Text style={{ fontSize: 20, color: "gray" }}>
                                lat:{fixNumber(userCurrentLocation.lat)}
                            </Text>
                            <Text style={{ fontSize: 20, color: "gray" }}>
                                lng:{fixNumber(userCurrentLocation.lng)}
                            </Text>
                        </View>

                    </View>

                    <View style={{
                        height: 220,
                        borderTopEndRadius: 50,
                        borderTopStartRadius: 50,
                        bottom: -80,
                        alignItems: "center",
                        backgroundColor: AppColors.primary
                    }}
                    >
                        <FlatList
                            data={[{ name: t("Orders"), qty: 0 }, { name: t("Completed"), qty: 0 }]}
                            horizontal
                            contentContainerStyle={{ width: "100%", flex: 1, justifyContent: "center" }}
                            renderItem={({ item }) => {
                                return (
                                    <View style={styles.itemFlatList}>
                                        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                                            {item.name}
                                        </Text>
                                        <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                                            {item.qty}
                                        </Text>
                                    </View>
                                );
                            }}
                        />
                    </View>
                    <View
                        style={{
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "white",
                            height: "45%",
                            borderTopEndRadius: 50,
                            borderTopStartRadius: 50,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 17,
                                textAlign: "center",
                                width: 350,
                                textTransform: "capitalize",
                                paddingVertical: 60,
                            }}
                        >
                            {t("ToggleButton")}
                        </Text>
                        <View style={{ flex: 1, justifyContent: "center" }}>
                            <View style={styles.containerSwitch}>
                                <AppActiveButton
                                    disabled={isLoading}
                                    isActive={driverStatus == "active"}
                                    onPress={updateWorkStatus}
                                />
                                <Text style={styles.switchText}>
                                    {t("MapStatus")}
                                </Text>

                            </View>
                            <View style={[styles.containerSwitch]}>
                                <AppActiveButton
                                    disabled={isLoading}
                                    isActive={isLinked}
                                    onPress={updateLink}
                                />
                                <Text style={styles.switchText}>
                                    {t("VehicleLink")}
                                </Text>
                            </View>

                        </View>
                    </View>
                </View>
                <AppSettingModal loctionPermission={loctionPermission} setIsVisble={setIsDeniedPermissions} isVisible={isDeniedPermissions} />
            </View>
        </ScrollView>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f1f6",
    },
    containerSwitch: {
        flex: 1,
        alignItems: 'center',
        justifyContent: "flex-start",
        flexDirection: "row",
        paddingHorizontal: 0,
        top: -50,
        marginVertical: 0
    },
    switchText: {
        fontSize: 20,
        marginHorizontal: 10,
        fontWeight: "bold"
        , textAlign: "center"
    },
    img: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderColor: AppColors.secondary
    },
    itemFlatList: {
        width: 100,
        height: 100,
        marginHorizontal: 10,
        marginVertical: 30,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
        backgroundColor: "rgba(190, 221, 231,0.3)",
    }
});
