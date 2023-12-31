import './App.css';
import { useEffect, useState, useRef, SetStateAction } from 'react';
import { bitable, FieldType, UIBuilder } from "@lark-base-open/js-sdk";
import { useTranslation } from 'react-i18next';
import { UseTranslationResponse } from 'react-i18next';
import './i18n';
import { G2, Datum, Scatter, Mix } from "@antv/g2plot";
import { InputNumber, Progress, Space, Radio, message, Switch, Select, Button, Flex, Alert, ColorPicker, Col, Divider, Row, SelectProps, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import html2canvas from 'html2canvas';
import { float } from 'html2canvas/dist/types/css/property-descriptors/float';
import { kmeans } from 'ml-kmeans';


export default function App() {
    const { t } = useTranslation();
    const chartContainerRef = useRef(null);
    const [options, setOptions] = useState<SelectProps['options']>([]);
    const [selectedValues, setSelectedValues] = useState<Array<string | undefined>>([undefined, undefined, undefined]);
    const [loadings, setLoadings] = useState<boolean>(false);
    const [percent, setPercent] = useState<number>(0);
    const isNextButtonDisabled = !(selectedValues[0]);
    const [clusteringSelect, setclusteringSelect] = useState('none');
    const [kmeansParams, setkmeansParams] = useState([3, 100]);

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

    const chartComponent = async (
        data: any[],
        xField = 'x',
        yField = 'y',
        pcolorField = '',

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
        console.log(pcolorField);
        console.log(data)
        const mixPlot = new Mix(chartContainerRef.current, {
            tooltip: { shared: true },
            syncViewPadding: true,
            plots: [
                {
                    type: 'scatter',
                    options: {
                        data: data,
                        xField: xField,
                        yField: yField,
                        colorField: 'cluster',
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

    const handleclusteringSelect = (value: string | undefined) => {
        setclusteringSelect(value);
    };

    const handleKmeansParams = (index: number, value: number) => {
        const newKP = [...kmeansParams];
        newKP[index] = value;
        setkmeansParams(newKP);
    };

    const renderClusteringOptions = () => {
        switch (clusteringSelect) {
            case 'kmeans':
                return (
                    <>
                        <Row gutter={16}>
                            <Col span={12}>聚类数量</Col>
                            <Col span={12}>
                                <InputNumber
                                    min={1}
                                    size='small'
                                    defaultValue={3}
                                    onChange={(value) => handleKmeansParams(0, value)}
                                />
                            </Col>
                        </Row>
                        <Row gutter={16} >
                            <Col span={11}>最大迭代数</Col>
                            <Col span={12}>
                                <InputNumber
                                    size='small'
                                    defaultValue={100}
                                    onChange={(value) => handleKmeansParams(1, value)}
                                />
                            </Col>
                        </Row>
                        <Row gutter={16} >
                            <Col span={10}>初始化方法</Col>
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
                    <div>
                        <span>dbscan params</span>
                    </div>
                );
            default:
                return null;
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

        const origin_data = [];
        for (let i of recordIdList) {
            const recordData = {};
            for (let o of fieldMetaList) {
                const cv = await table.getCellString(o.id, i)
                recordData[o?.name] = cv;
            }
            origin_data.push(recordData);
            console.log((recordIdList.indexOf(i) + 1) / recordIdList.length * 100)
            //console.log(recordIdList.length * 100)
            setPercent(parseFloat(((recordIdList.indexOf(i) + 1) / recordIdList.length * 100).toFixed(1)))
        }

        origin_data.map((item, index) => {
            item['index'] = index + 1;
            for (let key in item) {
                if (!isNaN(parseFloat(item[key]))) { item[key] = parseFloat(item[key]) }
            }
        })
        const data = origin_data;
        const xField = selectedValues[1];
        const yField = selectedValues[0];
        // kmeans clustering
        if (clusteringSelect == 'kmeans') {
            const loc_data = [];
            for (let i of data) {
                let a = [];
                a.push(i[xField]);
                a.push(i[yField]);
                loc_data.push(a);
            }
            const { clusters, centroids } = kmeans(
                loc_data,
                kmeansParams[0],
                { initialization: 'kmeans++', maxIterations: kmeansParams[1] }
            )
            for (let i = 0; i < data.length; i++) {
                data[i].cluster = clusters[i];
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
                <Progress status="active" percent={percent} />
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