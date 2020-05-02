import React, {useState, useEffect} from 'react';
import ReactDOM from 'react-dom';
import "./css/custom.scss";
import * as Fa from 'react-icons/fa';
import './css/bootstrap/scss/bootstrap.scss';
import tempData from './data/maskMap_20200214_1110.json';

let map = null,
    osm = new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            minZoom: 3, maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }),
    myLocationIcon = L.icon({iconUrl: "img/crosshairs-solid.svg", iconSize: [24, 24]}),
    myLocationMar = L.marker([0, 0], {icon: myLocationIcon}),
    storeIcon = [
        L.icon({iconUrl: "img/map-marker-red.svg", iconSize: [48, 48], iconAnchor: [24, 48], popupAnchor: [0, -48]}),
        L.icon({iconUrl: "img/map-marker-orange.svg", iconSize: [48, 48], iconAnchor: [24, 48], popupAnchor: [0, -48]}),
        L.icon({iconUrl: "img/map-marker-blue.svg", iconSize: [48, 48], iconAnchor: [24, 48], popupAnchor: [0, -48]}),
        L.icon({iconUrl: "img/map-marker-green.svg", iconSize: [48, 48], iconAnchor: [24, 48], popupAnchor: [0, -48]})
    ],
    storeMarkers = new L.markerClusterGroup({

        iconCreateFunction: function (cluster) {
            return L.divIcon({
                html: '<div>' + cluster._childCount + '</div>',
                className: "data-cluster ", iconSize: [72, 30]
            });
        },

        animate: true
    });

function markerIconIndex(str, num) {
    let rate;
    switch (str) {
        case "adult":
            rate = num / 200;
            return rate >= 0.5 ? 3 : rate >= 0.2 ? 2 : rate > 0 ? 1 : 0;
        case "child":
            rate = num / 50;
            return rate >= 0.5 ? 3 : rate >= 0.2 ? 2 : rate > 0 ? 1 : 0;
    }
}


function App() {
    let [myLocation, setMyLocation] = useState({coords: null, accuracy: null});
    let [mapInfo, setMapInfo] = useState({dataUpdateTime: null, maskIconType: "adult", openNotesDialog: true});
    const purchaseData = {day: ["日", "一", "二", "三", "四", "五", "六"], parity: ["不限", "奇數", "偶數", "奇數", "偶數", "奇數", "偶數"]};


    function popupContentTemplate(properties) {
        return '<table class="' + (new Date().getTime()) + '">' +
            '<tbody>' +
            '<tr>' +
            '<th>藥局名稱</th>' +
            '<td>' + properties.name + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th>藥局地址</th>' +
            '<td>' + "<a href='https://www.google.com/maps?q=" + properties.name + "+" + properties.address + "' target='_blank'>" +
            properties.address + "</a>" + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th>藥局電話</th>' +
            '<td>' + properties.phone + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th>成人口罩</th>' +
            '<td class="mask_adult">' + properties.mask_adult + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th>兒童口罩</th>' +
            '<td class="mask_child">' + properties.mask_child + '</td>' +
            '</tr>' +
            '<tr>' +
            '<th>更新時間</th>' +
            '<td class="storeUpdated">' + properties.updated + '</td>' +
            '</tr>' +
            '</tbody>' +
            '</table>';
    }

    function reloadDataDelay() {
        setTimeout(() => {
            reloadData()
        }, 30000)

    }

    function reloadData() {
        let updatXhr = new XMLHttpRequest;
        let dataIndex = {};
        updatXhr.addEventListener("load", function () {
            dataUpdateTimeChange(new Date());
            let mapDataJson = JSON.parse(this.responseText);
            for (let i = 0; i < mapDataJson.features.length; i++) {
                dataIndex[mapDataJson.features[i].properties.id] = i;
            }
            storeMarkers.eachLayer((layer) => {
                let stat = mapDataJson.features[dataIndex[layer.options.dataId]];
                layer._popup.setContent(popupContentTemplate(stat.properties));
                layer.options.mask_adult = stat.properties.mask_adult;
                layer.options.mask_child = stat.properties.mask_child;
                layer.setIcon(storeIcon[markerIconIndex(mapInfo.maskIconType, layer.options["mask_" + mapInfo.maskIconType])]);
            });
            storeMarkers.refreshClusters();
            reloadDataDelay();
        });
        updatXhr.open("GET", "https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json?time=" + new Date().getTime());
        updatXhr.send();
    }


    function buildMap(maskIconType, dataUpdateTimeChange) {
        map = L.map("mapid", {zoomControl: false, minZoom: 6, maxZoom: 18});
        map.addLayer(osm);
        map.setView([23.583, 120.582], 6);
        map.setMaxBounds([[40, 100], [10, 140]]);
        dataUpdateTimeChange(new Date("2020-02-14 11:10:00"));
        let mapData = tempData, dataIndex = {};
        for (let i = 0; i < mapData.features.length; i++) {
            dataIndex[mapData.features[i].properties.id] = i;
            mapData.features[i].properties.phone = mapData.features[i].properties.phone.replace(/ /g, "");
        }
        mapData.features[dataIndex["5931033130"]].geometry.coordinates = [121.517612, 25.006090];
        mapData.features[dataIndex["5931033176"]].geometry.coordinates = [121.518552, 25.007578];
        mapData.features[dataIndex["5931101455"]].geometry.coordinates = [121.461145, 25.136232];
        mapData.features[dataIndex["5931100092"]].geometry.coordinates = [121.461358, 25.136273];
        mapData.features.forEach((storeData) => {
            let marker = L.marker([storeData.geometry.coordinates[1], storeData.geometry.coordinates[0]],
                {
                    icon: storeIcon[markerIconIndex(maskIconType, storeData.properties.mask_adult)],
                    mask_adult: storeData.properties.mask_adult,
                    mask_child: storeData.properties.mask_child,
                    dataId: storeData.properties.id
                }
            );
            marker.bindPopup(popupContentTemplate(storeData.properties), {maxWidth: "auto"});
            storeMarkers.addLayer(marker);
        });
        map.addLayer(storeMarkers);
        reloadData();
    }

    function dataUpdateTimeChange(dataUpdateTime) {
        setMapInfo((preData) => {
            return {...preData, dataUpdateTime: dataUpdateTime}
        });
    }

    useEffect(() => {

        buildMap(mapInfo.maskIconType, dataUpdateTimeChange);

        if (navigator.geolocation) {
            navigator.geolocation.watchPosition((position) => {
                setMyLocation({
                    accuracy: position.coords.accuracy,
                    coords: [position.coords.latitude, position.coords.longitude]
                });
                myLocationMar.setLatLng([position.coords.latitude, position.coords.longitude]);
                myLocationMar.bindPopup("<p class='myLocation-title'>目前位置</p><p class='myLocation-accuracy'>位置精確度：" + Math.round(position.coords.accuracy * 100) / 100 + " 公尺</p>");
                myLocationMar.addTo(map);
            }, function () {
            }, {enableHighAccuracy: true});//有拿到位置就呼叫 showPosition 函式
        }
    }, []);

    function findMyLocation() {
        if (myLocation.coords)
            map.flyTo(myLocationMar.getLatLng(), 16);
        else
            alert("無法顯示目前位置");
    }

    function changeMaskIconType() {
        let type = mapInfo.maskIconType === "adult" ? "child" : "adult";
        setMapInfo({...mapInfo, maskIconType: type});
        storeMarkers.eachLayer(function (layer) {
            layer.setIcon(storeIcon[markerIconIndex(type, layer.options["mask_" + type])]);
        });
        storeMarkers.refreshClusters();
    }

    function toggleNoteDialog() {
        setMapInfo({...mapInfo, openNotesDialog: !mapInfo.openNotesDialog});
    }

    return (<>
        <div id="mapid" style={{paddingBottom: '30px'}}/>
        <div className="control-menu">
            <button onClick={changeMaskIconType}>{mapInfo.maskIconType === "child" ? "小孩" : "大人"}</button>
            <button onClick={findMyLocation} title="移動到所在位置"><Fa.FaLocationArrow/></button>

            <button onClick={() => {
                map.zoomIn()
            }} title="放大"><Fa.FaPlus/></button>
            <button onClick={() => {
                map.zoomOut()
            }} title="縮小"><Fa.FaMinus/></button>
            <button onClick={toggleNoteDialog} title="注意"><Fa.FaQuestion/></button>
        </div>
        <div className="fixed-top m-2 rounded" style={{right: 'auto', backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
            <table className="table table-sm table-borderless text-white text-center">
                <tbody>
                <tr style={{fontSize: '18px', fontWeight: '600'}}>
                    <td colSpan="4">口罩地圖</td>
                </tr>
                <tr style={{fontSize: '18px', fontWeight: '600'}}>
                    <td colSpan="4">星期{purchaseData.day[new Date().getDay()]} - {purchaseData.parity[new Date().getDay()]}</td>
                </tr>
                <tr>
                    <td><img src="./img/map-marker-green.svg" width="25" height="25"/></td>
                    <td><img src="./img/map-marker-blue.svg" width="25" height="25"/></td>
                    <td><img src="./img/map-marker-orange.svg" width="25" height="25"/></td>
                    <td><img src="./img/map-marker-red.svg" width="25" height="25"/></td>
                </tr>
                <tr style={{fontSize: '14px'}}>
                    <td>50% <Fa.FaArrowUp style={{marginTop: '-5px'}}/></td>
                    <td>20% <Fa.FaArrowUp style={{marginTop: '-5px'}}/></td>
                    <td>0% <Fa.FaArrowUp style={{marginTop: '-5px'}}/></td>
                    <td>沒有口罩</td>
                </tr>
                <tr style={{fontSize: '14px'}}>
                    <td colSpan="4">更新時間
                        : {mapInfo.dataUpdateTime ? new Date(mapInfo.dataUpdateTime).toLocaleString() : "--"}</td>
                </tr>
                </tbody>
            </table>
        </div>
        <div className="msg"><Fa.FaMapMarkerAlt/>Copyright 2020 by <a href="https://github.com/silverLibra/mask_map"
                                                                      target="_blank">Hung Yi Cheng - gitHub</a></div>
        {mapInfo.openNotesDialog &&
        <div className="noteMsgDialogBackGround" onClick={toggleNoteDialog}>
            <div className="noteMsgDialog" onClick={(e) => {
                e.stopPropagation();
            }}>
                <div className="text-right">
                    <button onClick={toggleNoteDialog}>
                        <Fa.FaTimes/>
                    </button>
                </div>
                <div className="noteMsgContent">
                    <ul>
                        <li>口罩庫存請依照該藥局所通知之存量，本服務僅供線上查詢參考</li>
                        <li>請依照指揮中心或行政院最新通知為主
                    </ul>
                </div>
            </div>
        </div>
        }
    </>)
}


ReactDOM.render(
    <>
        <App/>
    </>,
    document.getElementById('root')
);
