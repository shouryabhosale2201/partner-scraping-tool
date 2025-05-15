const locationListApi = async () => {
    const asiaPacificCountries = [];

    try {
        const url = 'https://partner-finder.oracle.com/catalog/api/file/OPN-EXPERTISELIST-DF';
        const response = await fetch(url);
        const locationData = await response.json();

        const locationList = locationData.locationList;

        if (Array.isArray(locationList)) {
            for (const topLevel of locationList) {
                for (const level2 of topLevel.level_2_list || []) {
                    for (const level3 of level2.level_3_list || []) {
                        if (level3.level_label === 'Asia Pacific') {
                            for (const level4 of level3.level_4_list || []) {
                                asiaPacificCountries.push({
                                    id: level4.level_id,
                                    name: level4.level_label
                                });
                            }
                        }
                    }
                }
            }
        }

        console.log('🌏 Asia Pacific Countries:', asiaPacificCountries);
    } catch (error) {
        console.error('❌ Error fetching location list:', error.message);
    }

    return asiaPacificCountries;
};

module.exports = locationListApi;
