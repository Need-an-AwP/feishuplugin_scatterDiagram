import './App.css';
import { useEffect, useState, useRef, SetStateAction } from 'react';
import { bitable, FieldType } from "@lark-base-open/js-sdk";
import { useTranslation } from 'react-i18next';
import { UseTranslationResponse } from 'react-i18next';
import './i18n';
import { G2, Datum, Scatter, Mix } from "@antv/g2plot";
import { InputNumber, Progress, Space, Radio, message, Switch, Select, Button, Flex, Alert, ColorPicker, Col, Divider, Row, SelectProps, Typography } from 'antd';
import type { RadioChangeEvent, ColorPickerProps } from 'antd';
import html2canvas from 'html2canvas';
import { float } from 'html2canvas/dist/types/css/property-descriptors/float';
import { kmeans } from 'ml-kmeans';
import { DBSCAN } from 'density-clustering';
import { isString } from 'antd/es/button';
import moment from 'moment';


export default function App() {
    const { t } = useTranslation();
    const chartContainerRef = useRef(null);
    const [options, setOptions] = useState<SelectProps['options']>([]);
    const [selectedValues, setSelectedValues] = useState<Array<string | undefined>>([undefined, undefined, undefined]);
    const [loadings, setLoadings] = useState<boolean>(false);
    const [percent, setPercent] = useState<number>(0);
    const isNextButtonDisabled = !(selectedValues[0]);
    const [regressionSelect, setregressionSelect] = useState('none');
    const [regressionParams, setregressionParams] = useState([5, 60])
    const [regressionLineColor, setregressionLineColor] = useState('#7f7f7f')
    const [clusteringSelect, setclusteringSelect] = useState('none');
    const [kmeansParams, setkmeansParams] = useState([3, 100]);
    const [dbscanParams, setdbscanParams] = useState([5, 2])

    useEffect(() => {
        const fetchData = async () => {
            const newOptions: SelectProps['options'] = [];
            const selection = await bitable.base.getSelection();
            const table = await bitable.base.getTableById(selection?.tableId!);
            const fieldMetaList = await table.getFieldMetaList();
            for (let a of fieldMetaList) {
                newOptions.push({
                    label: a.name,
                    value: a.name,
                });
            }
            newOptions.push({ label: '行序号', value: 'index' })
            setOptions(newOptions);
            //add default value to usestate
            setSelectedValues([newOptions[0].label.toString(), newOptions.at(-1).value.toString()])
        };

        fetchData();

    }, []);

    function findDateByIndex(indexToFind, odata) {
        const foundItem = odata.find(item => item.index.toString() === indexToFind);
        return foundItem ? foundItem.date : null;
    }

    const chartComponent = async (
        data: any[],
        xField = 'x',
        yField = 'y',
    ) => {
        const oldChart = chartContainerRef.current.chart;
        if (oldChart) {
            oldChart.destroy();
        }

        /*
        views: [
                {
                    data:data,
                    axes: {},
                    geometries: [{
                        type: 'point',
                        xField: xField,
                        yField: yField,
                        mapping: {},
                    }],
                },
                {
                    data: data,
                    axes: false,
                    geometries: [{
                        type: 'line',
                        xField: xField,
                        yField: yField,
                        mapping: {},
                    }]
                }
            ]
        */

        console.log(xField);
        console.log(yField);
        console.log(data)
        const mixPlot = new Mix(chartContainerRef.current, {
            tooltip: { shared: true },
            appendPadding: 3,
            syncViewPadding: true,
            plots: [
                {
                    type: 'scatter',
                    options: {
                        data: data,
                        xField: xField,
                        yField: yField,
                        colorField: 'cluster',
                        regressionLine: {
                            top: true,
                            type: regressionSelect,
                            style: {
                                lineWidth: regressionParams[0],
                                stroke: regressionLineColor,
                                strokeOpacity: regressionParams[1] / 100,
                            },
                        },
                        pointStyle: { strokeOpacity: 1 },
                        yAxis: { grid: { line: {} } },
                        xAxis: {
                            grid: null,
                            label: {
                                formatter: (datum, index) => {
                                    if (data[0].parsedDate != null) {
                                        const a = findDateByIndex(datum, data);
                                        return a;
                                    }else {
                                        return datum;
                                    }
                                },
                            },
                        },
                    },
                },
            ]
        })
        mixPlot.render();
        chartContainerRef.current.chart = mixPlot;
    };

    const handleChange = (index: number, value: string | undefined) => {
        const newSelectedValues = [...selectedValues];
        newSelectedValues[index] = value;
        setSelectedValues(newSelectedValues);
    };

    const handleRegressionSelect = (value: string | undefined) => {
        setregressionSelect(value);
    };

    const handleRegressionParams = (index: number, value: number) => {
        const newRP = [...regressionParams];
        newRP[index] = value;
        setregressionParams(newRP);
    };

    const handleclusteringSelect = (value: string | undefined) => {
        setclusteringSelect(value);
    };

    const handleKmeansParams = (index: number, value: number) => {
        const newKP = [...kmeansParams];
        newKP[index] = value;
        setkmeansParams(newKP);
    };

    const handledbscanParams = (index: number, value: number) => {
        const newDP = [...dbscanParams];
        newDP[index] = value;
        setdbscanParams(newDP);
    };

    const renderClusteringOptions = () => {
        switch (clusteringSelect) {
            case 'kmeans':
                return (
                    <>
                        <Row gutter={16}>
                            <Col span={13} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>聚类数量</Col>
                            <Col span={9}>
                                <InputNumber
                                    min={1}
                                    size='small'
                                    defaultValue={3}
                                    onChange={(value) => handleKmeansParams(0, value)}
                                />
                            </Col>
                        </Row>
                        <Row gutter={16} >
                            <Col span={12} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>最大迭代数</Col>
                            <Col span={9}>
                                <InputNumber
                                    size='small'
                                    defaultValue={100}
                                    onChange={(value) => handleKmeansParams(1, value)}
                                />
                            </Col>
                        </Row>
                        <Row gutter={16} >
                            <Col span={11} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>初始化方法</Col>
                            <Col span={9}>
                                <Radio.Group defaultValue={'kmeans++'}>
                                    <Space direction="vertical">
                                        <Radio value={'kmeans++'}>kmeans++</Radio>
                                        <Radio value={'random'}>随机</Radio>
                                        <Radio value={'mostDistant'}>最远距离</Radio>
                                    </Space>
                                </Radio.Group>
                            </Col>
                        </Row>
                    </>
                );

            case 'dbscan':
                return (
                    <>
                        <Row gutter={16}>
                            <Col span={13} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>邻域半径</Col>
                            <Col span={9}>
                                <InputNumber
                                    min={1}
                                    size='small'
                                    defaultValue={5}
                                    onChange={(value) => handledbscanParams(0, value)}
                                />
                            </Col>
                        </Row>
                        <Row gutter={16} >
                            <Col span={13} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>最小点数</Col>
                            <Col span={9}>
                                <InputNumber
                                    size='small'
                                    defaultValue={2}
                                    onChange={(value) => handledbscanParams(1, value)}
                                />
                            </Col>
                        </Row>
                    </>
                );

            default:
                return null;
        }
    };

    const renderRegressionOptions = () => {
        if (regressionSelect != 'none') {
            return (
                <>
                    <Row gutter={16}>
                        <Col span={12} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>回归线粗细</Col>
                        <Col span={12}>
                            <InputNumber
                                min={1}
                                size='small'
                                defaultValue={regressionParams[0]}
                                onChange={(value) => handleRegressionParams(0, value)}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={17} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>回归线颜色</Col>
                        <Col span={5}>
                            <ColorPicker
                                value={regressionLineColor}
                                disabledAlpha
                                onChangeComplete={(color) => {
                                    setregressionLineColor(color.toHexString());
                                }}
                            />
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12} style={{ display: 'flex', alignItems: 'center', fontWeight: 'lighter' }}>回归线透明度</Col>
                        <Col span={5}>
                            <InputNumber
                                min={1}
                                max={99}
                                size='small'
                                defaultValue={regressionParams[1]}
                                onChange={(value) => handleRegressionParams(1, value)}
                            />
                        </Col>
                    </Row>
                </>
            );
        }

    };

    const handleNextButtonClick = async () => {
        setLoadings(true);
        const selection = await bitable.base.getSelection();
        const table = await bitable.base.getTableById(selection?.tableId!);
        const viewMetaList = await table.getViewMetaList();
        const view = await table.getViewById(viewMetaList[0]?.id);
        const fieldMetaList = await view.getFieldMetaList();
        const recordIdList = await view.getVisibleRecordIdList();
        const fieldIdList = await view.getVisibleFieldIdList();

        const checkCellStr = await table.getCellString(fieldMetaList.find(item => item.name === selectedValues[0]).id, recordIdList[0])
        if (isNaN(parseFloat(checkCellStr))) {
            setLoadings(false);
            message.error('绘图数据错误', 2);
            return
        } else { }
        //get data from feishu
        const origin_data = [];
        for (let i of recordIdList) {
            const recordData = {};
            for (let o of fieldMetaList) {
                const cv = await table.getCellString(o.id, i)
                recordData[o?.name] = cv;
            }
            origin_data.push(recordData);
            setPercent(parseFloat(((recordIdList.indexOf(i) + 1) / recordIdList.length * 100).toFixed(1)))
            //console.log(parseFloat(((recordIdList.indexOf(i) + 1) / recordIdList.length * 100).toFixed(1)))
        }
        //handle if data contains date
        origin_data.forEach((item, index) => {
            for (let key in item) {
                const value = item[key];

                if (!isNaN(parseFloat(value)) && !value.includes('-')) {
                    item[key] = parseFloat(value);
                } else if (moment(value, moment.ISO_8601, true).isValid()) {
                    item['parsedDate'] = moment(value);
                }
            }
        });
        origin_data.sort((a, b) => {
            const datetimeA = a['parsedDate'];
            const datetimeB = b['parsedDate'];

            if (datetimeA && datetimeB) {
                return datetimeA - datetimeB;
            }
            return 0;
        });
        origin_data.forEach((item, index) => { item['index'] = index + 1; })


        const xField = selectedValues[1];
        const yField = selectedValues[0];
        //process cluster data
        let loc_data = [];
        if (isString(origin_data[0][xField])) {
            for (let i of origin_data) {
                let a = [];
                a.push(i['index']);
                a.push(i[yField]);
                loc_data.push(a);
            }
        } if (isString(origin_data[0][yField])) {
            for (let i of origin_data) {
                let a = [];
                a.push(i[xField]);
                a.push(i['index']);
                loc_data.push(a);
            }
        }
        // kmeans clustering
        if (clusteringSelect == 'kmeans') {
            const { clusters, centroids } = kmeans(
                loc_data,
                kmeansParams[0],
                { initialization: 'kmeans++', maxIterations: kmeansParams[1] }
            )
            for (let i = 0; i < origin_data.length; i++) {
                origin_data[i].cluster = clusters[i];
            }

        }
        //DBSCAN clustering
        if (clusteringSelect == 'dbscan') {
            loc_data = loc_data.map(point => point.map(value => Number.isFinite(value) ? value : 0));
            let dbscan = new DBSCAN;
            const clusters = dbscan.run(loc_data, dbscanParams[0], dbscanParams[1]);

            let pointToCluster = [];
            clusters.forEach((cluster, index) => {
                cluster.forEach(pointIndex => {
                    pointToCluster[pointIndex] = index;
                });
            });
            for (let i = 0; i < origin_data.length; i++) {
                origin_data[i].cluster = pointToCluster[i];
            }
        }


        chartComponent(
            origin_data,    //data
            xField,         //xfield
            yField,         //yfield
            //Object.keys(origin_data[0])[2],
        );
        setLoadings(false);
    };


    return (
        <main style={{ margin: '20px' }}>
            <Space wrap style={{ width: '100%' }} direction="horizontal">
                <span style={{ fontSize: '15px' }}>选择纵轴数据</span>
                {options.length > 0 && (
                    <Select
                        style={{ width: 150, marginRight: '10px' }}
                        placeholder=""
                        value={selectedValues[0]}
                        onChange={(value) => handleChange(0, value)}
                        options={options}
                        defaultValue={options[0].value.toString()}
                    />
                )}
                <span style={{ fontSize: '15px' }}>选择横轴数据</span>
                {options.length > 0 && (
                    <Select
                        style={{ width: 150, marginRight: '10px' }}
                        placeholder=""
                        value={selectedValues[1]}
                        onChange={(value) => handleChange(1, value)}
                        options={options}
                        defaultValue={options.at(-1).value.toString()}
                    />
                )}
            </Space>
            <Divider />
            <Space wrap style={{ width: '100%', marginBottom: '10px' }} direction="horizontal">

                <span style={{ fontSize: '15px', marginRight: '15px' }}>绘制回归线</span>
                <Select
                    style={{ width: 150, marginRight: '10px' }}
                    options={[
                        { label: '无', value: 'none' },
                        { label: '线性', value: 'linear' },
                        { label: '指数', value: 'exp' },
                        { label: '局部加权', value: 'loess' },
                        { label: '对数', value: 'log' },
                        { label: '多项式', value: 'poly' },
                        { label: '幂函数', value: 'pow' },
                        { label: '二次多项式', value: 'quad' },
                    ]}
                    onChange={(value) => handleRegressionSelect(value)}
                    defaultValue='none'
                />
                {renderRegressionOptions()}
            </Space>

            <Space wrap style={{ width: '100%', marginBottom: '20px' }} direction="horizontal">
                <span style={{ fontSize: '15px' }}>选择聚类算法</span>
                <Select
                    style={{ width: 150, marginRight: '10px' }}
                    options={[
                        { label: '无', value: 'none' },
                        { label: 'KMeans', value: 'kmeans' },
                        { label: 'DBSCAN', value: 'dbscan' },
                    ]}
                    onChange={(value) => handleclusteringSelect(value)}
                    defaultValue='none'
                />
                {renderClusteringOptions()}
            </Space>

            <Button
                type="default"
                block
                onClick={handleNextButtonClick}
                //disabled={isNextButtonDisabled}
                loading={loadings}
                style={{ marginBottom: '20px' }}
            >
                下一步
            </Button>

            {percent > 0 && percent < 100 && (
                <Progress percent={percent} strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }} />
            )}

            <Button
                type="default"
                block
                style={{ marginBottom: '20px' }}

            >
                将聚类结果添加到表格
            </Button>
            <div ref={chartContainerRef} style={{ width: '97%', height: '425px', resize: 'vertical', overflow: 'auto', marginTop: '20px', marginBottom: '20px' }}></div>

        </main>

    );
}